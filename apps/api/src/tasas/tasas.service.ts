import { type SerieTrmDto, type TasaDiaDto } from '@agroprecios/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { type TasaCambioCruda } from '../ingesta/adapters/fuente-adapter.interface.js';
import { TasaCambio } from './entities/tasa-cambio.entity.js';

export interface ConteoUpsert {
  insertados: number;
  actualizados: number;
}

/** Filas por lote en el upsert (5 parámetros por fila, muy por debajo del límite de PostgreSQL). */
const TAMANO_LOTE = 500;

/** TRM y conversión de monedas. Las conversiones usan aritmética decimal, nunca `number`. */
@Injectable()
export class TasasService {
  constructor(
    @InjectRepository(TasaCambio) private readonly tasas: Repository<TasaCambio>,
    @InjectRepository(Fuente) private readonly fuentes: Repository<Fuente>,
  ) {}

  /**
   * Upsert idempotente de tasas (PK fecha + monedas). Solo actualiza si el valor
   * o la fuente cambiaron, así que reejecutar la misma ingesta reporta 0/0.
   * Debe correr dentro de la transacción de la ingesta (`em`).
   */
  async guardar(
    em: EntityManager,
    fuenteId: number,
    tasas: TasaCambioCruda[],
  ): Promise<ConteoUpsert> {
    const conteo: ConteoUpsert = { insertados: 0, actualizados: 0 };
    for (let i = 0; i < tasas.length; i += TAMANO_LOTE) {
      const lote = tasas.slice(i, i + TAMANO_LOTE);
      const parametros: unknown[] = [];
      const valores = lote.map((t, j) => {
        parametros.push(t.fecha, t.monedaOrigen, t.monedaDestino, t.valor, fuenteId);
        const b = j * 5;
        return `($${b + 1}::date, $${b + 2}, $${b + 3}, $${b + 4}::numeric, $${b + 5}::int)`;
      });
      const filas = await em.query<{ insertado: boolean }[]>(
        `INSERT INTO tasa_cambio (fecha, moneda_origen, moneda_destino, valor, fuente_id)
         VALUES ${valores.join(', ')}
         ON CONFLICT (fecha, moneda_origen, moneda_destino) DO UPDATE
           SET valor = EXCLUDED.valor, fuente_id = EXCLUDED.fuente_id
           WHERE tasa_cambio.valor IS DISTINCT FROM EXCLUDED.valor
              OR tasa_cambio.fuente_id IS DISTINCT FROM EXCLUDED.fuente_id
         RETURNING (xmax = 0) AS insertado`,
        parametros,
      );
      for (const fila of filas) {
        if (fila.insertado) conteo.insertados++;
        else conteo.actualizados++;
      }
    }
    return conteo;
  }

  /**
   * TRM vigente en una fecha (COP por 1 USD): la de esa fecha o, si no existe,
   * la anterior más cercana. null si no hay ninguna.
   */
  async trmVigente(fecha: string): Promise<TasaDiaDto | null> {
    const tasa = await this.tasas
      .createQueryBuilder('t')
      .where("t.moneda_origen = 'USD' AND t.moneda_destino = 'COP' AND t.fecha <= :fecha", {
        fecha,
      })
      .orderBy('t.fecha', 'DESC')
      .getOne();
    return tasa ? { fecha: tasa.fecha, valor: tasa.valor } : null;
  }

  /** Serie de la TRM entre dos fechas (incluidas), con la atribución de la fuente. */
  async serieTrm(desde: string, hasta: string): Promise<SerieTrmDto> {
    const fuente = await this.fuentes.findOneBy({ slug: 'trm' });
    if (!fuente) {
      throw new NotFoundException('La fuente trm no está registrada');
    }
    const tasas = await this.tasas
      .createQueryBuilder('t')
      .where("t.moneda_origen = 'USD' AND t.moneda_destino = 'COP'")
      .andWhere('t.fecha BETWEEN :desde AND :hasta', { desde, hasta })
      .orderBy('t.fecha', 'ASC')
      .getMany();
    return {
      fuente: { slug: fuente.slug, nombre: fuente.nombre, licencia: fuente.licencia },
      desde,
      hasta,
      items: tasas.map((t) => ({ fecha: t.fecha, valor: t.valor })),
    };
  }
}
