import {
  type DisparoIngesta,
  type EstadoIngesta,
  type IngestaEjecucionDto,
} from '@agroprecios/shared';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { fechaBogota, sumarDias } from '../common/fechas.js';
import { VariablesEntorno } from '../config/variables-entorno.js';
import { TasasService } from '../tasas/tasas.service.js';
import { FUENTE_ADAPTERS, type FuenteAdapter } from './adapters/fuente-adapter.interface.js';
import { IngestaEjecucion } from './entities/ingesta-ejecucion.entity.js';
import { cargarMapeo, guardarObservaciones } from './guardar-observaciones.js';

/** Tiempo máximo de una descarga si el adapter no define otro. */
const TIMEOUT_DESCARGA_MS = 30_000;

export interface OpcionesEjecucion {
  /** Fecha mínima de los datos (YYYY-MM-DD). Sin ella se usa la ventana configurada. */
  desde?: string;
}
const MAX_LARGO_ERROR = 2000;

export interface FiltroBitacora {
  fuente?: string;
  estado?: EstadoIngesta;
  limite?: number;
}

/**
 * Orquesta las ingestas: ejecuta el adapter de una fuente, guarda los datos en
 * su PROPIA transacción (todo o nada) y registra cada ejecución en
 * ingesta_ejecucion. Un fallo en una fuente no afecta a las demás.
 */
@Injectable()
export class IngestaService {
  private readonly logger = new Logger(IngestaService.name);
  private readonly adapters: Map<string, FuenteAdapter>;
  /** Evita dos ejecuciones simultáneas de la misma fuente en esta instancia. */
  private readonly enCurso = new Set<string>();

  constructor(
    @Inject(FUENTE_ADAPTERS) adapters: FuenteAdapter[],
    @InjectRepository(IngestaEjecucion) private readonly ejecuciones: Repository<IngestaEjecucion>,
    @InjectRepository(Fuente) private readonly fuentes: Repository<Fuente>,
    private readonly dataSource: DataSource,
    private readonly tasas: TasasService,
    private readonly config: ConfigService<VariablesEntorno, true>,
  ) {
    this.adapters = new Map(adapters.map((a) => [a.slug, a]));
  }

  /** Ventana por defecto (días hacia atrás) de cada fuente; configurable por entorno. */
  private desdePorDefecto(slug: string): string | undefined {
    if (slug === 'sipsa') {
      return sumarDias(fechaBogota(), -this.config.get('SIPSA_DIAS_VENTANA', { infer: true }));
    }
    return undefined;
  }

  /** Slugs de las fuentes que tienen adapter registrado. */
  fuentesConAdapter(): string[] {
    return [...this.adapters.keys()];
  }

  /**
   * Ejecuta la ingesta de una fuente. Nunca lanza por fallos de la fuente: el
   * resultado (incluido un ERROR) queda en la bitácora y se devuelve.
   */
  async ejecutar(
    slug: string,
    disparo: DisparoIngesta,
    opciones: OpcionesEjecucion = {},
  ): Promise<IngestaEjecucionDto> {
    const adapter = this.adapters.get(slug);
    if (!adapter) {
      throw new NotFoundException(`La fuente "${slug}" no tiene ingesta automática`);
    }
    const fuente = await this.fuentes.findOneBy({ slug, activo: true });
    if (!fuente) {
      throw new NotFoundException(`La fuente "${slug}" no existe o está inactiva`);
    }
    if (this.enCurso.has(slug)) {
      throw new ConflictException(`Ya hay una ingesta de "${slug}" en curso`);
    }

    this.enCurso.add(slug);
    // La fila EN_CURSO se guarda fuera de la transacción: queda registro aunque todo falle.
    const ejecucion = await this.ejecuciones.save(
      this.ejecuciones.create({ fuenteId: fuente.id, disparo, estado: 'EN_CURSO' }),
    );

    try {
      const codigos = new Set((await cargarMapeo(this.dataSource.manager, fuente.id)).keys());
      const resultado = await adapter.ejecutar({
        desde: opciones.desde ?? this.desdePorDefecto(slug),
        codigos,
        signal: AbortSignal.timeout(adapter.timeoutMs ?? TIMEOUT_DESCARGA_MS),
      });

      const tasas = resultado.tasas ?? [];
      // Todo o nada: tasas, mercados y observaciones en UNA transacción por ejecución.
      const conteo = await this.dataSource.transaction(async (em) => {
        const deTasas = await this.tasas.guardar(em, fuente.id, tasas);
        const deObs = await guardarObservaciones(
          em,
          fuente.id,
          ejecucion.id,
          resultado.observaciones,
        );
        return {
          insertados: deTasas.insertados + deObs.insertados,
          actualizados: deTasas.actualizados + deObs.actualizados,
          mercadosNuevos: deObs.mercadosNuevos,
          advertencias: deObs.advertencias,
        };
      });
      const advertencias = [...(resultado.advertencias ?? []), ...conteo.advertencias];

      Object.assign(ejecucion, {
        estado: advertencias.length > 0 ? 'PARCIAL' : 'OK',
        fin: new Date(),
        leidos: tasas.length + resultado.observaciones.length,
        insertados: conteo.insertados,
        actualizados: conteo.actualizados,
        mercadosNuevos: conteo.mercadosNuevos,
        payloadHash: resultado.payloadHash,
        error: advertencias.length > 0 ? recortar(advertencias.join('\n')) : null,
      } satisfies Partial<IngestaEjecucion>);
      this.logger.log(
        `Ingesta ${slug}: ${ejecucion.estado} (leídos ${ejecucion.leidos}, ` +
          `insertados ${conteo.insertados}, actualizados ${conteo.actualizados}, ` +
          `mercados nuevos ${conteo.mercadosNuevos})`,
      );
    } catch (error) {
      Object.assign(ejecucion, {
        estado: 'ERROR',
        fin: new Date(),
        error: recortar(error instanceof Error ? error.message : String(error)),
      } satisfies Partial<IngestaEjecucion>);
      this.logger.error(`Ingesta ${slug} falló: ${ejecucion.error}`);
    } finally {
      this.enCurso.delete(slug);
    }

    await this.ejecuciones.save(ejecucion);
    return aDto(ejecucion, slug);
  }

  /** Bitácora de ingestas, más recientes primero. */
  async bitacora(filtro: FiltroBitacora): Promise<IngestaEjecucionDto[]> {
    const consulta = this.ejecuciones
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.fuente', 'f')
      .orderBy('e.inicio', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .take(Math.min(filtro.limite ?? 50, 200));
    if (filtro.fuente) consulta.andWhere('f.slug = :slug', { slug: filtro.fuente });
    if (filtro.estado) consulta.andWhere('e.estado = :estado', { estado: filtro.estado });
    const filas = await consulta.getMany();
    return filas.map((e) => aDto(e, e.fuente.slug));
  }
}

function recortar(texto: string): string {
  return texto.length > MAX_LARGO_ERROR ? `${texto.slice(0, MAX_LARGO_ERROR)}…` : texto;
}

function aDto(e: IngestaEjecucion, slug: string): IngestaEjecucionDto {
  return {
    id: e.id,
    fuente: slug,
    disparo: e.disparo,
    inicio: e.inicio.toISOString(),
    fin: e.fin?.toISOString() ?? null,
    estado: e.estado,
    leidos: e.leidos,
    insertados: e.insertados,
    actualizados: e.actualizados,
    mercadosNuevos: e.mercadosNuevos,
    error: e.error,
    payloadHash: e.payloadHash,
  };
}
