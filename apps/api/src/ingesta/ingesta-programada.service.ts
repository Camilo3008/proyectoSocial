import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { ZONA_NEGOCIO } from '../common/fechas.js';
import { VariablesEntorno } from '../config/variables-entorno.js';
import { IngestaService } from './ingesta.service.js';

/**
 * Jobs programados de ingesta (zona America/Bogota). Cada fuente tiene su
 * propio job y sus errores quedan aislados en la bitácora.
 * Se desactivan con INGESTA_PROGRAMADA=false.
 */
@Injectable()
export class IngestaProgramadaService {
  private readonly logger = new Logger(IngestaProgramadaService.name);
  private readonly activa: boolean;

  constructor(
    private readonly ingesta: IngestaService,
    config: ConfigService<VariablesEntorno, true>,
  ) {
    this.activa = config.get('INGESTA_PROGRAMADA', { infer: true });
  }

  /**
   * TRM: la Superfinanciera certifica en la tarde la tasa del siguiente día
   * hábil. 18:30 la toma ese mismo día; 07:30 es el respaldo si falló.
   */
  @Cron('0 30 7,18 * * *', { name: 'ingesta-trm', timeZone: ZONA_NEGOCIO })
  async trm(): Promise<void> {
    await this.ejecutar('trm');
  }

  private async ejecutar(slug: string): Promise<void> {
    if (!this.activa) {
      return;
    }
    try {
      await this.ingesta.ejecutar(slug, 'PROGRAMADO');
    } catch (error) {
      // Errores de configuración (fuente inactiva, ejecución en curso): solo se registran.
      this.logger.warn(`No se ejecutó la ingesta programada de ${slug}: ${String(error)}`);
    }
  }
}
