import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ZONA_NEGOCIO } from '../common/fechas.js';
import { VariablesEntorno } from '../config/variables-entorno.js';
import { IngestaService } from './ingesta.service.js';

/**
 * Jobs programados de ingesta (zona America/Bogota). Los horarios se leen del
 * entorno (TRM_CRON, SIPSA_CRON) para poder ajustarlos sin cambiar código, y
 * todos se desactivan con INGESTA_PROGRAMADA=false. Cada fuente tiene su propio
 * job y sus errores quedan aislados en la bitácora.
 */
@Injectable()
export class IngestaProgramadaService implements OnModuleInit {
  private readonly logger = new Logger(IngestaProgramadaService.name);

  constructor(
    private readonly ingesta: IngestaService,
    private readonly registro: SchedulerRegistry,
    private readonly config: ConfigService<VariablesEntorno, true>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('INGESTA_PROGRAMADA', { infer: true })) {
      this.logger.log('Ingesta programada desactivada (INGESTA_PROGRAMADA=false)');
      return;
    }
    this.programar('trm', this.config.get('TRM_CRON', { infer: true }));
    this.programar('sipsa', this.config.get('SIPSA_CRON', { infer: true }));
    this.programar('worldbank', this.config.get('WORLDBANK_CRON', { infer: true }));
    this.programar('faostat', this.config.get('FAOSTAT_CRON', { infer: true }));
  }

  private programar(slug: string, expresion: string): void {
    const job = CronJob.from({
      cronTime: expresion,
      timeZone: ZONA_NEGOCIO,
      onTick: () => this.ejecutar(slug),
      start: true,
    });
    this.registro.addCronJob(`ingesta-${slug}`, job);
    this.logger.log(`Ingesta ${slug} programada: "${expresion}" (${ZONA_NEGOCIO})`);
  }

  private async ejecutar(slug: string): Promise<void> {
    try {
      await this.ingesta.ejecutar(slug, 'PROGRAMADO');
    } catch (error) {
      // Errores de configuración (fuente inactiva, ejecución en curso): solo se registran.
      this.logger.warn(`No se ejecutó la ingesta programada de ${slug}: ${String(error)}`);
    }
  }
}
