import {
  type DisparoIngesta,
  type EstadoIngesta,
  type IngestaEjecucionDto,
} from '@agroprecios/shared';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { TasasService } from '../tasas/tasas.service.js';
import { FUENTE_ADAPTERS, type FuenteAdapter } from './adapters/fuente-adapter.interface.js';
import { IngestaEjecucion } from './entities/ingesta-ejecucion.entity.js';

/** Tiempo máximo de una descarga antes de abortarla. */
const TIMEOUT_DESCARGA_MS = 30_000;
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
  ) {
    this.adapters = new Map(adapters.map((a) => [a.slug, a]));
  }

  /** Slugs de las fuentes que tienen adapter registrado. */
  fuentesConAdapter(): string[] {
    return [...this.adapters.keys()];
  }

  /**
   * Ejecuta la ingesta de una fuente. Nunca lanza por fallos de la fuente: el
   * resultado (incluido un ERROR) queda en la bitácora y se devuelve.
   */
  async ejecutar(slug: string, disparo: DisparoIngesta): Promise<IngestaEjecucionDto> {
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
      const resultado = await adapter.ejecutar({
        signal: AbortSignal.timeout(TIMEOUT_DESCARGA_MS),
      });
      if (resultado.observaciones.length > 0) {
        // TODO(etapa-2): normalizar observaciones (código externo -> producto, mercado, país)
        // y hacer el upsert con la clave uq_observacion_precio_clave. Hoy solo hay TRM.
        throw new Error('La normalización de observaciones de precio aún no está implementada');
      }

      const tasas = resultado.tasas ?? [];
      const conteo = await this.dataSource.transaction((em) =>
        this.tasas.guardar(em, fuente.id, tasas),
      );
      const advertencias = resultado.advertencias ?? [];

      Object.assign(ejecucion, {
        estado: advertencias.length > 0 ? 'PARCIAL' : 'OK',
        fin: new Date(),
        leidos: tasas.length + resultado.observaciones.length,
        insertados: conteo.insertados,
        actualizados: conteo.actualizados,
        payloadHash: resultado.payloadHash,
        error: advertencias.length > 0 ? recortar(advertencias.join('\n')) : null,
      } satisfies Partial<IngestaEjecucion>);
      this.logger.log(
        `Ingesta ${slug}: ${ejecucion.estado} (leídos ${ejecucion.leidos}, ` +
          `insertados ${conteo.insertados}, actualizados ${conteo.actualizados})`,
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
    error: e.error,
    payloadHash: e.payloadHash,
  };
}
