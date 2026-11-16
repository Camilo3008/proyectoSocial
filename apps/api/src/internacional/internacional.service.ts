import {
  type CommoditiesDto,
  type ReferenciaNacionalDto,
  type SerieInternacionalDto,
} from '@agroprecios/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { Producto } from '../catalogo/entities/producto.entity.js';
import { citaDe } from '../common/citas.js';
import { ConsultasPreciosService } from '../precios/consultas-precios.service.js';

const FUENTE_INTERNACIONAL = 'worldbank';
/** Rango por defecto: los últimos 24 meses con datos. */
const MESES_POR_DEFECTO = 24;

function restarMeses(fecha: string, meses: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - meses);
  return d.toISOString().slice(0, 10);
}

/**
 * Series internacionales mensuales (Banco Mundial) y su comparación con el
 * precio nacional de referencia (RF-04). El globo por país (FAOSTAT) llega en
 * la Etapa 4.
 */
@Injectable()
export class InternacionalService {
  constructor(
    @InjectRepository(Producto) private readonly productos: Repository<Producto>,
    @InjectRepository(Fuente) private readonly fuentes: Repository<Fuente>,
    private readonly dataSource: DataSource,
    private readonly consultas: ConsultasPreciosService,
  ) {}

  async commodities(
    slug: string,
    desdePedido?: string,
    hastaPedido?: string,
  ): Promise<CommoditiesDto> {
    const producto = await this.productos.findOneBy({ slug, activo: true });
    if (!producto) throw new NotFoundException(`El producto "${slug}" no existe`);
    const fuente = await this.fuentes.findOneBy({ slug: FUENTE_INTERNACIONAL });
    if (!fuente) throw new NotFoundException('La fuente del Banco Mundial no está registrada');

    const [ultimo] = await this.dataSource.query<{ fecha: string | null }[]>(
      `SELECT to_char(max(fecha), 'YYYY-MM-DD') AS fecha FROM observacion_precio
       WHERE producto_id = $1 AND fuente_id = $2 AND anulado = false`,
      [producto.id, fuente.id],
    );
    if (!ultimo?.fecha) {
      throw new NotFoundException(`No hay precios internacionales de "${producto.nombre}"`);
    }
    const hasta = hastaPedido ?? ultimo.fecha;
    const desde = desdePedido ?? restarMeses(hasta, MESES_POR_DEFECTO - 1);
    if (desde > hasta) throw new BadRequestException('desde no puede ser posterior a hasta');

    const filas = await this.dataSource.query<
      { presentacion: string; fecha: string; usd: string; cop: string | null }[]
    >(
      `SELECT presentacion, to_char(fecha, 'YYYY-MM-DD') AS fecha,
              valor_usd_kg::text AS usd, valor_cop_kg::text AS cop
       FROM observacion_precio
       WHERE producto_id = $1 AND fuente_id = $2 AND anulado = false
         AND periodicidad = 'MENSUAL' AND unidad = 'kg' AND fecha BETWEEN $3 AND $4
       ORDER BY presentacion, fecha`,
      [producto.id, fuente.id, desde, hasta],
    );
    const series = new Map<string, SerieInternacionalDto>();
    for (const f of filas) {
      const serie = series.get(f.presentacion) ?? { presentacion: f.presentacion, items: [] };
      serie.items.push({ fecha: f.fecha, valorUsdKg: f.usd, valorCopKg: f.cop });
      series.set(f.presentacion, serie);
    }

    return {
      producto: { slug: producto.slug, nombre: producto.nombre },
      fuente: { slug: fuente.slug, nombre: fuente.nombre, cita: citaDe(fuente.slug) },
      desde,
      hasta,
      series: [...series.values()],
      nacional: await this.referenciaNacional(producto, desde, hasta),
    };
  }

  /**
   * Promedio mensual en COP/kg de la serie nacional que usa "Hoy" (FNC para el
   * café, SIPSA Neiva para el banano). null si el producto no tiene precio
   * nacional (p. ej. cacao, cuya referencia es la internacional).
   */
  private async referenciaNacional(
    producto: Producto,
    desde: string,
    hasta: string,
  ): Promise<ReferenciaNacionalDto | null> {
    const ref = await this.consultas.referenciaPrincipal(producto.id, producto.slug);
    if (!ref || ref.fuente.slug === FUENTE_INTERNACIONAL) return null;

    const items = await this.dataSource.query<{ fecha: string; valorCopKg: string }[]>(
      `SELECT to_char(date_trunc('month', fecha), 'YYYY-MM-DD') AS fecha,
              round(avg(valor_cop_kg), 4)::text AS "valorCopKg"
       FROM observacion_precio
       WHERE producto_id = $1 AND fuente_id = $2 AND COALESCE(mercado_id, 0) = $3
         AND presentacion = $4 AND unidad = $5 AND moneda = $6 AND anulado = false
         AND valor_cop_kg IS NOT NULL
         AND fecha >= $7::date AND fecha < ($8::date + interval '1 month')
       GROUP BY 1 ORDER BY 1`,
      [
        producto.id,
        ref.fuenteId,
        ref.mercadoId ?? 0,
        ref.presentacion,
        ref.unidad,
        ref.moneda,
        desde,
        hasta,
      ],
    );
    return {
      fuente: { slug: ref.fuente.slug, nombre: ref.fuente.nombre, cita: citaDe(ref.fuente.slug) },
      mercado: ref.mercado?.nombre ?? null,
      presentacion: ref.presentacion,
      items,
    };
  }
}
