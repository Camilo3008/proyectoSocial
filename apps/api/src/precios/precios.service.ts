import {
  type ComplementoPrecioDto,
  type ObservacionPrecioDto,
  type PrecioReferenciaDto,
  type PreciosHoyDto,
} from '@agroprecios/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { type UsuarioAutenticado } from '../auth/auth.service.js';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { Mercado } from '../catalogo/entities/mercado.entity.js';
import { Pais } from '../catalogo/entities/pais.entity.js';
import { Producto } from '../catalogo/entities/producto.entity.js';
import { calcularVariacion } from '../common/decimal.js';
import { esFechaValida, fechaBogota } from '../common/fechas.js';
import { calcularDerivados } from '../common/unidades.js';
import { TasasService } from '../tasas/tasas.service.js';
import { ObservacionPrecio } from './entities/observacion-precio.entity.js';
import { CargaManualPrecioCuerpo } from './precios.dto.js';
import { type CriterioReferencia, REFERENCIAS_HOY } from './referencias-hoy.js';

/** Violación de restricción única en PostgreSQL. */
const PG_UNICA = '23505';

interface EntradaHistorial {
  valorAnterior: string;
  moneda: string;
  unidad: string;
  motivoAnulacion: string | null;
  reemplazadoEn: string;
  reemplazadoPor: number;
}

/** Consultas de precios y carga manual con trazabilidad. */
@Injectable()
export class PreciosService {
  constructor(
    @InjectRepository(ObservacionPrecio)
    private readonly observaciones: Repository<ObservacionPrecio>,
    @InjectRepository(Producto) private readonly productos: Repository<Producto>,
    @InjectRepository(Fuente) private readonly fuentes: Repository<Fuente>,
    private readonly dataSource: DataSource,
    private readonly tasas: TasasService,
  ) {}

  // ---------------------------------------------------------------------------
  // Carga manual (RF-07)
  // ---------------------------------------------------------------------------

  /**
   * Registra una observación cargada a mano. Si ya existe una activa con la
   * misma clave (producto, fuente, mercado, país, fecha, periodicidad y
   * presentación) responde 409: primero hay que anularla. Si la existente está
   * anulada, se reutiliza la fila y el valor anterior queda en metadata.historial.
   */
  async cargarManual(
    cuerpo: CargaManualPrecioCuerpo,
    usuario: UsuarioAutenticado,
  ): Promise<ObservacionPrecioDto> {
    if (!esFechaValida(cuerpo.fecha)) {
      throw new BadRequestException('fecha no es una fecha de calendario válida');
    }
    if (cuerpo.fecha > fechaBogota()) {
      throw new BadRequestException('fecha no puede ser futura');
    }

    try {
      const id = await this.dataSource.transaction(async (em) => {
        const producto = await em.findOneBy(Producto, { slug: cuerpo.producto, activo: true });
        if (!producto) throw new BadRequestException(`El producto "${cuerpo.producto}" no existe`);
        const fuente = await em.findOneBy(Fuente, { slug: cuerpo.fuente, activo: true });
        if (!fuente) throw new BadRequestException(`La fuente "${cuerpo.fuente}" no existe`);
        if (cuerpo.mercadoId && !(await em.existsBy(Mercado, { id: cuerpo.mercadoId }))) {
          throw new BadRequestException(`El mercado ${cuerpo.mercadoId} no existe`);
        }
        if (cuerpo.paisIso3 && !(await em.existsBy(Pais, { iso3: cuerpo.paisIso3 }))) {
          throw new BadRequestException(`El país ${cuerpo.paisIso3} no existe`);
        }

        const trm = await this.tasas.trmVigente(cuerpo.fecha);
        const valores = {
          valor: cuerpo.valor,
          moneda: cuerpo.moneda,
          unidad: cuerpo.unidad,
          ...calcularDerivados(cuerpo.valor, cuerpo.moneda, cuerpo.unidad, trm?.valor ?? null),
          ingestaId: null,
          creadoPorId: usuario.id,
          anulado: false,
          motivoAnulacion: null,
        };
        const clave = {
          productoId: producto.id,
          fuenteId: fuente.id,
          mercadoId: cuerpo.mercadoId ?? null,
          paisIso3: cuerpo.paisIso3 ?? null,
          fecha: cuerpo.fecha,
          periodicidad: cuerpo.periodicidad ?? 'DIARIA',
          presentacion: cuerpo.presentacion,
        } as const;
        const metadataBase: Record<string, unknown> = {
          cargaManual: true,
          referencia: cuerpo.referencia ?? null,
          trmUsada: trm,
        };

        const existente = await this.buscarPorClave(em, clave);
        if (existente && !existente.anulado) {
          throw new ConflictException(
            `Ya existe un precio activo con esos datos (id ${existente.id}). ` +
              'Anúlelo primero si necesita corregirlo.',
          );
        }
        if (existente) {
          const historial = [
            ...((existente.metadata?.['historial'] as EntradaHistorial[] | undefined) ?? []),
            {
              valorAnterior: existente.valor,
              moneda: existente.moneda,
              unidad: existente.unidad,
              motivoAnulacion: existente.motivoAnulacion,
              reemplazadoEn: new Date().toISOString(),
              reemplazadoPor: usuario.id,
            } satisfies EntradaHistorial,
          ];
          Object.assign(existente, valores, { metadata: { ...metadataBase, historial } });
          await em.save(existente);
          return existente.id;
        }
        const nueva = await em.save(
          em.create(ObservacionPrecio, { ...clave, ...valores, metadata: metadataBase }),
        );
        return nueva.id;
      });
      return this.obtener(id);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === PG_UNICA
      ) {
        throw new ConflictException('Ya existe un precio con esos datos');
      }
      throw error;
    }
  }

  /** Anula una observación (nunca se borra). Queda registrado quién, cuándo y por qué. */
  async anular(
    id: string,
    motivo: string,
    usuario: UsuarioAutenticado,
  ): Promise<ObservacionPrecioDto> {
    await this.dataSource.transaction(async (em) => {
      const obs = await em.findOne(ObservacionPrecio, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!obs) throw new NotFoundException(`No existe la observación ${id}`);
      if (obs.anulado) throw new ConflictException(`La observación ${id} ya está anulada`);
      Object.assign(obs, {
        anulado: true,
        motivoAnulacion: motivo,
        metadata: {
          ...(obs.metadata ?? {}),
          anulacion: { por: usuario.id, en: new Date().toISOString(), motivo },
        },
      });
      await em.save(obs);
    });
    return this.obtener(id);
  }

  async obtener(id: string): Promise<ObservacionPrecioDto> {
    const o = await this.observaciones.findOne({
      where: { id },
      relations: { producto: true, fuente: true, mercado: true },
    });
    if (!o) throw new NotFoundException(`No existe la observación ${id}`);
    return {
      id: o.id,
      producto: { slug: o.producto.slug, nombre: o.producto.nombre },
      fuente: { slug: o.fuente.slug, nombre: o.fuente.nombre },
      mercado: o.mercado ? { id: o.mercado.id, nombre: o.mercado.nombre } : null,
      paisIso3: o.paisIso3,
      fecha: o.fecha,
      periodicidad: o.periodicidad,
      presentacion: o.presentacion,
      valor: o.valor,
      moneda: o.moneda,
      unidad: o.unidad,
      valorCopKg: o.valorCopKg,
      valorUsdKg: o.valorUsdKg,
      anulado: o.anulado,
      motivoAnulacion: o.motivoAnulacion,
      creadoEn: o.creadoEn.toISOString(),
    };
  }

  private buscarPorClave(
    em: EntityManager,
    clave: Pick<
      ObservacionPrecio,
      | 'productoId'
      | 'fuenteId'
      | 'mercadoId'
      | 'paisIso3'
      | 'fecha'
      | 'periodicidad'
      | 'presentacion'
    >,
  ): Promise<ObservacionPrecio | null> {
    // Misma semántica que el índice único uq_observacion_precio_clave (COALESCE).
    return em
      .createQueryBuilder(ObservacionPrecio, 'o')
      .setLock('pessimistic_write')
      .where('o.producto_id = :productoId AND o.fuente_id = :fuenteId', {
        productoId: clave.productoId,
        fuenteId: clave.fuenteId,
      })
      .andWhere('COALESCE(o.mercado_id, 0) = :mercadoClave', { mercadoClave: clave.mercadoId ?? 0 })
      .andWhere("COALESCE(o.pais_iso3, '') = :paisClave", { paisClave: clave.paisIso3 ?? '' })
      .andWhere('o.fecha = :fecha AND o.periodicidad = :periodicidad', {
        fecha: clave.fecha,
        periodicidad: clave.periodicidad,
      })
      .andWhere('o.presentacion = :presentacion', { presentacion: clave.presentacion })
      .getOne();
  }

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
      const principal = await this.ultimaObservacion(producto.id, config?.principal);
      if (!principal) {
        sinDatos.push({ slug: producto.slug, nombre: producto.nombre });
        continue;
      }
      const complementos: ComplementoPrecioDto[] = [];
      for (const criterio of config?.complementos ?? []) {
        const obs = await this.ultimaObservacion(producto.id, criterio);
        if (obs)
          complementos.push({ etiqueta: criterio.etiqueta, ...(await this.aReferencia(obs)) });
      }
      items.push({
        producto: { slug: producto.slug, nombre: producto.nombre },
        ...(await this.aReferencia(principal)),
        complementos,
      });
    }

    return {
      generadoEn: ahora.toISOString(),
      hoy,
      items,
      sinDatos,
      trm: await this.trmHoy(hoy),
    };
  }

  /** Última observación activa de un producto que cumple el criterio (o de cualquier serie). */
  private ultimaObservacion(
    productoId: number,
    criterio?: CriterioReferencia,
  ): Promise<ObservacionPrecio | null> {
    const consulta = this.observaciones
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.fuente', 'f')
      .leftJoinAndSelect('o.mercado', 'm')
      .where('o.producto_id = :productoId AND o.anulado = false', { productoId })
      .orderBy('o.fecha', 'DESC')
      .addOrderBy('o.actualizado_en', 'DESC');
    if (criterio) {
      consulta
        .andWhere('f.slug = :fuente', { fuente: criterio.fuente })
        .andWhere('o.presentacion = :presentacion', { presentacion: criterio.presentacion });
      if (criterio.mercado === null) consulta.andWhere('o.mercado_id IS NULL');
      else consulta.andWhere('m.nombre = :mercado', { mercado: criterio.mercado });
    }
    return consulta.getOne();
  }

  /** Convierte una observación en precio de referencia, con su variación frente a la anterior. */
  private async aReferencia(obs: ObservacionPrecio): Promise<PrecioReferenciaDto> {
    // Dato anterior COMPARABLE: misma serie (fuente, mercado, país, presentación) y misma unidad y moneda.
    const anterior = await this.observaciones
      .createQueryBuilder('o')
      // Parámetros explícitos: nunca pasar la entidad (sus relaciones pisarían los nombres).
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
      fuente: { slug: obs.fuente.slug, nombre: obs.fuente.nombre },
      mercado: obs.mercado ? { nombre: obs.mercado.nombre } : null,
      fecha: obs.fecha,
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
}
