import {
  type ComparativoDto,
  type ComplementoPrecioDto,
  type PrecioReferenciaDto,
  type PreciosHoyDto,
  type SerieDisponibleDto,
  type SeriePrecioDto,
} from '@agroprecios/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { Producto } from '../catalogo/entities/producto.entity.js';
import { citaDe } from '../common/citas.js';
import { calcularVariacion } from '../common/decimal.js';
import { fechaBogota, sumarDias } from '../common/fechas.js';
import { TasasService } from '../tasas/tasas.service.js';
import { ObservacionPrecio } from './entities/observacion-precio.entity.js';
import { type CriterioReferencia, DIAS_DATO_RECIENTE, REFERENCIAS_HOY } from './referencias-hoy.js';

/** Identifica una serie: misma fuente, mercado, presentación, unidad y moneda. */
export interface FiltroSerie {
  producto: string;
  fuente?: string;
  /** Id del mercado; si se da `fuente` y no `mercado`, la serie es sin mercado. */
  mercado?: number;
  presentacion?: string;
  desde?: string;
  hasta?: string;
}

const fuenteDato = (f: { slug: string; nombre: string }) => ({
  slug: f.slug,
  nombre: f.nombre,
  cita: citaDe(f.slug),
});

/** Consultas públicas de precios: hoy (RF-01), histórico (RF-02) y comparativo (RF-03). */
@Injectable()
export class ConsultasPreciosService {
  constructor(
    @InjectRepository(ObservacionPrecio)
    private readonly observaciones: Repository<ObservacionPrecio>,
    @InjectRepository(Producto) private readonly productos: Repository<Producto>,
    @InjectRepository(Fuente) private readonly fuentes: Repository<Fuente>,
    private readonly dataSource: DataSource,
    private readonly tasas: TasasService,
  ) {}

  // ---------------------------------------------------------------------------
  // Precio del día (RF-01)
  // ---------------------------------------------------------------------------

  async hoy(ahora = new Date()): Promise<PreciosHoyDto> {
    const hoy = fechaBogota(ahora);
    const productos = await this.productos.find({ where: { activo: true }, order: { id: 'ASC' } });

    const items: PreciosHoyDto['items'] = [];
    const sinDatos: PreciosHoyDto['sinDatos'] = [];

    for (const producto of productos) {
      const config = REFERENCIAS_HOY[producto.slug];
      const principal = await this.ultimaObservacion(producto.id, hoy, config?.principal);
      if (!principal) {
        sinDatos.push({ slug: producto.slug, nombre: producto.nombre });
        continue;
      }
      const complementos: ComplementoPrecioDto[] = [];
      for (const criterio of config?.complementos ?? []) {
        // Los complementos con mercados preferidos usan el mismo mercado que el principal.
        const obs = await this.ultimaObservacion(
          producto.id,
          hoy,
          criterio.mercadosPreferidos && principal.mercado
            ? { ...criterio, mercadosPreferidos: undefined, mercado: principal.mercado.nombre }
            : criterio,
        );
        if (obs)
          complementos.push({ etiqueta: criterio.etiqueta, ...(await this.aReferencia(obs)) });
      }
      items.push({
        producto: { slug: producto.slug, nombre: producto.nombre },
        ...(await this.aReferencia(principal)),
        complementos,
      });
    }

    return { generadoEn: ahora.toISOString(), hoy, items, sinDatos, trm: await this.trmHoy(hoy) };
  }

  /**
   * Observación más reciente de la serie de referencia de un producto (la de
   * "Hoy"). La usa el módulo internacional para comparar con el precio nacional.
   */
  referenciaPrincipal(productoId: number, slug: string, hoy = fechaBogota()) {
    return this.ultimaObservacion(productoId, hoy, REFERENCIAS_HOY[slug]?.principal);
  }

  /**
   * Última observación activa de un producto según el criterio. Con mercados
   * preferidos usa el primero que tenga datos recientes; si ninguno los tiene,
   * el de dato más reciente.
   */
  private async ultimaObservacion(
    productoId: number,
    hoy: string,
    criterio?: CriterioReferencia,
  ): Promise<ObservacionPrecio | null> {
    const base = () => {
      const q = this.observaciones
        .createQueryBuilder('o')
        .innerJoinAndSelect('o.fuente', 'f')
        .leftJoinAndSelect('o.mercado', 'm')
        .where('o.producto_id = :productoId AND o.anulado = false', { productoId })
        .orderBy('o.fecha', 'DESC')
        .addOrderBy('o.actualizado_en', 'DESC');
      if (criterio) {
        q.andWhere('f.slug = :fuente', { fuente: criterio.fuente }).andWhere(
          'o.presentacion = :presentacion',
          { presentacion: criterio.presentacion },
        );
      }
      return q;
    };

    if (!criterio) return base().getOne();

    if (criterio.mercadosPreferidos) {
      const candidatas: ObservacionPrecio[] = [];
      for (const codigo of criterio.mercadosPreferidos) {
        const obs = await base()
          .andWhere('m.codigo_externo = :codigo AND m.fuente_id = f.id', { codigo })
          .getOne();
        if (!obs) continue;
        if (obs.fecha >= sumarDias(hoy, -DIAS_DATO_RECIENTE)) return obs;
        candidatas.push(obs);
      }
      return candidatas.sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
    }

    const q = base();
    if (criterio.mercado === null) q.andWhere('o.mercado_id IS NULL');
    else if (criterio.mercado) q.andWhere('m.nombre = :mercado', { mercado: criterio.mercado });
    return q.getOne();
  }

  /** Convierte una observación en precio de referencia, con su variación frente a la anterior. */
  private async aReferencia(obs: ObservacionPrecio): Promise<PrecioReferenciaDto> {
    // Dato anterior COMPARABLE: misma serie (fuente, mercado, país, presentación, unidad y moneda).
    // Parámetros explícitos: nunca pasar la entidad (sus relaciones pisarían los nombres).
    const anterior = await this.observaciones
      .createQueryBuilder('o')
      .where('o.producto_id = :productoId AND o.fuente_id = :fuenteId', {
        productoId: obs.productoId,
        fuenteId: obs.fuenteId,
      })
      .andWhere('COALESCE(o.mercado_id, 0) = :mercadoClave', { mercadoClave: obs.mercadoId ?? 0 })
      .andWhere("COALESCE(o.pais_iso3, '') = :paisClave", { paisClave: obs.paisIso3 ?? '' })
      .andWhere('o.presentacion = :presentacion AND o.unidad = :unidad', {
        presentacion: obs.presentacion,
        unidad: obs.unidad,
      })
      .andWhere('o.moneda = :moneda AND o.periodicidad = :periodicidad', {
        moneda: obs.moneda,
        periodicidad: obs.periodicidad,
      })
      .andWhere('o.fecha < :fecha AND o.anulado = false', { fecha: obs.fecha })
      .orderBy('o.fecha', 'DESC')
      .getOne();

    return {
      fuente: fuenteDato(obs.fuente),
      mercado: obs.mercado ? { id: obs.mercado.id, nombre: obs.mercado.nombre } : null,
      fecha: obs.fecha,
      periodicidad: obs.periodicidad,
      presentacion: obs.presentacion,
      valor: obs.valor,
      moneda: obs.moneda,
      unidad: obs.unidad,
      valorCopKg: obs.valorCopKg,
      variacion: anterior
        ? { ...calcularVariacion(obs.valor, anterior.valor), fechaAnterior: anterior.fecha }
        : null,
    };
  }

  private async trmHoy(hoy: string): Promise<PreciosHoyDto['trm']> {
    const [tasa, fuente] = await Promise.all([
      this.tasas.trmVigente(hoy),
      this.fuentes.findOneBy({ slug: 'trm' }),
    ]);
    if (!tasa || !fuente) return null;
    return {
      ...tasa,
      fuente: { slug: fuente.slug, nombre: fuente.nombre, licencia: fuente.licencia },
    };
  }

  // ---------------------------------------------------------------------------
  // Histórico (RF-02)
  // ---------------------------------------------------------------------------

  /** Series disponibles para un producto, de la más reciente a la más antigua. */
  async series(slugProducto: string): Promise<SerieDisponibleDto[]> {
    const producto = await this.productoActivo(slugProducto);
    const filas = await this.dataSource.query<
      {
        fuente_slug: string;
        fuente_nombre: string;
        mercado_id: number | null;
        mercado_nombre: string | null;
        departamento: string | null;
        presentacion: string;
        unidad: string;
        moneda: string;
        desde: string;
        hasta: string;
        cantidad: number;
      }[]
    >(
      `SELECT f.slug AS fuente_slug, f.nombre AS fuente_nombre, m.id AS mercado_id,
              m.nombre AS mercado_nombre, m.departamento, o.presentacion, o.unidad, o.moneda,
              to_char(min(o.fecha), 'YYYY-MM-DD') AS desde,
              to_char(max(o.fecha), 'YYYY-MM-DD') AS hasta, count(*)::int AS cantidad
       FROM observacion_precio o
       JOIN fuente f ON f.id = o.fuente_id
       LEFT JOIN mercado m ON m.id = o.mercado_id
       WHERE o.producto_id = $1 AND o.anulado = false
       GROUP BY f.slug, f.nombre, m.id, m.nombre, m.departamento, o.presentacion, o.unidad, o.moneda
       ORDER BY max(o.fecha) DESC, f.slug, o.presentacion, m.nombre`,
      [producto.id],
    );
    // La serie que usa "Hoy" es la predeterminada (p. ej. plátano hartón verde en Neiva).
    const referencia = await this.ultimaObservacion(
      producto.id,
      fechaBogota(),
      REFERENCIAS_HOY[producto.slug]?.principal,
    );
    const esReferencia = (s: (typeof filas)[number]) =>
      referencia !== null &&
      s.fuente_slug === referencia.fuente.slug &&
      (s.mercado_id ?? null) === (referencia.mercadoId ?? null) &&
      s.presentacion === referencia.presentacion &&
      s.unidad === referencia.unidad &&
      s.moneda === referencia.moneda;

    return filas.map((s) => ({
      fuente: fuenteDato({ slug: s.fuente_slug, nombre: s.fuente_nombre }),
      mercado:
        s.mercado_id === null
          ? null
          : { id: s.mercado_id, nombre: s.mercado_nombre ?? '', departamento: s.departamento },
      presentacion: s.presentacion,
      unidad: s.unidad,
      moneda: s.moneda,
      desde: s.desde,
      hasta: s.hasta,
      cantidad: s.cantidad,
      predeterminada: esReferencia(s),
    }));
  }

  /**
   * Serie histórica de una sola serie comparable. Sin fuente ni presentación,
   * usa la referencia de la pantalla "Hoy" para ese producto.
   */
  async serie(filtro: FiltroSerie, ahora = new Date()): Promise<SeriePrecioDto> {
    const producto = await this.productoActivo(filtro.producto);
    const hoy = fechaBogota(ahora);

    // 1. Resolver qué serie se pide a partir de su observación más reciente.
    let ultima: ObservacionPrecio | null;
    if (filtro.fuente || filtro.presentacion) {
      if (!filtro.fuente || !filtro.presentacion) {
        throw new BadRequestException('Indique fuente y presentacion juntas');
      }
      const q = this.observaciones
        .createQueryBuilder('o')
        .innerJoinAndSelect('o.fuente', 'f')
        .leftJoinAndSelect('o.mercado', 'm')
        .where('o.producto_id = :productoId AND o.anulado = false', { productoId: producto.id })
        .andWhere('f.slug = :fuente AND o.presentacion = :presentacion', {
          fuente: filtro.fuente,
          presentacion: filtro.presentacion,
        })
        .orderBy('o.fecha', 'DESC');
      if (filtro.mercado) q.andWhere('o.mercado_id = :mercado', { mercado: filtro.mercado });
      else q.andWhere('o.mercado_id IS NULL');
      ultima = await q.getOne();
    } else {
      ultima = await this.ultimaObservacion(
        producto.id,
        hoy,
        REFERENCIAS_HOY[producto.slug]?.principal,
      );
    }
    if (!ultima) {
      throw new NotFoundException('No hay datos para esa serie');
    }

    // 2. Rango: por defecto los últimos 30 días hasta el último dato.
    const hasta = filtro.hasta ?? ultima.fecha;
    const desde = filtro.desde ?? sumarDias(hasta, -30);
    if (desde > hasta) {
      throw new BadRequestException('desde no puede ser posterior a hasta');
    }

    const parametros = [
      producto.id,
      ultima.fuenteId,
      ultima.mercadoId ?? 0,
      ultima.paisIso3 ?? '',
      ultima.presentacion,
      ultima.unidad,
      ultima.moneda,
      desde,
      hasta,
    ];
    const condicion = `o.producto_id = $1 AND o.fuente_id = $2 AND COALESCE(o.mercado_id, 0) = $3
      AND COALESCE(o.pais_iso3, '') = $4 AND o.presentacion = $5 AND o.unidad = $6
      AND o.moneda = $7 AND o.fecha BETWEEN $8 AND $9 AND o.anulado = false`;

    const [items, [resumen]] = await Promise.all([
      this.dataSource.query<{ fecha: string; valor: string }[]>(
        `SELECT to_char(o.fecha, 'YYYY-MM-DD') AS fecha, o.valor::text AS valor
         FROM observacion_precio o WHERE ${condicion} ORDER BY o.fecha`,
        parametros,
      ),
      this.dataSource.query<
        {
          minimo: string | null;
          maximo: string | null;
          promedio: string | null;
          cantidad: number;
        }[]
      >(
        `SELECT min(o.valor)::text AS minimo, max(o.valor)::text AS maximo,
                round(avg(o.valor), 4)::text AS promedio, count(*)::int AS cantidad
         FROM observacion_precio o WHERE ${condicion}`,
        parametros,
      ),
    ]);

    return {
      producto: { slug: producto.slug, nombre: producto.nombre },
      fuente: fuenteDato(ultima.fuente),
      mercado: ultima.mercado ? { id: ultima.mercado.id, nombre: ultima.mercado.nombre } : null,
      presentacion: ultima.presentacion,
      unidad: ultima.unidad,
      moneda: ultima.moneda,
      desde,
      hasta,
      items,
      resumen:
        resumen && resumen.cantidad > 0
          ? {
              minimo: resumen.minimo!,
              maximo: resumen.maximo!,
              promedio: resumen.promedio!,
              cantidad: resumen.cantidad,
            }
          : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Comparativo nacional (RF-03)
  // ---------------------------------------------------------------------------

  /**
   * Precio de un producto en cada mercado para una fecha (por defecto la última
   * con datos), ordenado de mayor a menor, con la diferencia frente al mercado
   * de referencia de la región (el preferido más cercano a Pitalito con dato).
   */
  async comparativo(
    slugProducto: string,
    presentacionPedida?: string,
    fechaPedida?: string,
  ): Promise<ComparativoDto> {
    const producto = await this.productoActivo(slugProducto);
    const config = REFERENCIAS_HOY[producto.slug]?.principal;
    const presentacion = presentacionPedida ?? config?.presentacion;
    if (!presentacion) {
      throw new BadRequestException('Indique la presentación del producto');
    }

    const condicionBase = `o.producto_id = $1 AND o.presentacion = $2 AND o.anulado = false
      AND o.mercado_id IS NOT NULL AND m.tipo = 'MAYORISTA'`;
    let fecha = fechaPedida ?? null;
    if (!fecha) {
      const [ultima] = await this.dataSource.query<{ fecha: string | null }[]>(
        `SELECT to_char(max(o.fecha), 'YYYY-MM-DD') AS fecha
         FROM observacion_precio o JOIN mercado m ON m.id = o.mercado_id WHERE ${condicionBase}`,
        [producto.id, presentacion],
      );
      fecha = ultima?.fecha ?? null;
    }

    const filas = fecha
      ? await this.dataSource.query<
          {
            mercado_id: number;
            nombre: string;
            departamento: string | null;
            codigo_externo: string | null;
            valor: string;
            unidad: string;
            moneda: string;
            fuente_slug: string;
            fuente_nombre: string;
          }[]
        >(
          `SELECT m.id AS mercado_id, m.nombre, m.departamento, m.codigo_externo,
                  o.valor::text AS valor, o.unidad, o.moneda,
                  f.slug AS fuente_slug, f.nombre AS fuente_nombre
           FROM observacion_precio o
           JOIN mercado m ON m.id = o.mercado_id
           JOIN fuente f ON f.id = o.fuente_id
           WHERE ${condicionBase} AND o.fecha = $3
           ORDER BY o.valor DESC, m.nombre`,
          [producto.id, presentacion, fecha],
        )
      : [];

    const primera = filas[0];
    const preferidos = config?.mercadosPreferidos ?? [];
    const referencia =
      preferidos
        .map((codigo) => filas.find((f) => f.codigo_externo === codigo))
        .find((f) => f !== undefined) ?? null;

    return {
      producto: { slug: producto.slug, nombre: producto.nombre },
      presentacion,
      unidad: primera?.unidad ?? 'kg',
      moneda: primera?.moneda ?? 'COP',
      fecha: filas.length > 0 ? fecha : null,
      fuente: primera
        ? fuenteDato({ slug: primera.fuente_slug, nombre: primera.fuente_nombre })
        : null,
      referencia: referencia
        ? { mercadoId: referencia.mercado_id, nombre: referencia.nombre, valor: referencia.valor }
        : null,
      items: filas.map((f) => ({
        mercado: { id: f.mercado_id, nombre: f.nombre, departamento: f.departamento },
        valor: f.valor,
        diferenciaPct: referencia ? calcularVariacion(f.valor, referencia.valor).porcentaje : null,
        esReferencia: f.mercado_id === referencia?.mercado_id,
      })),
    };
  }

  private async productoActivo(slug: string): Promise<Producto> {
    const producto = await this.productos.findOneBy({ slug, activo: true });
    if (!producto) throw new NotFoundException(`El producto "${slug}" no existe`);
    return producto;
  }
}
