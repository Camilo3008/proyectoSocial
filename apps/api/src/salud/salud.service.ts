import { type SaludDto } from '@agroprecios/shared';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VERSION_API } from '../common/version.js';

@Injectable()
export class SaludService {
  private readonly logger = new Logger(SaludService.name);

  constructor(private readonly dataSource: DataSource) {}

  async verificar(): Promise<SaludDto> {
    const baseDatos = await this.verificarBaseDatos();
    return {
      estado: baseDatos.estado,
      verificadoEn: new Date().toISOString(),
      version: VERSION_API,
      baseDatos,
    };
  }

  private async verificarBaseDatos(): Promise<SaludDto['baseDatos']> {
    const inicio = performance.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { estado: 'ok', latenciaMs: Math.round(performance.now() - inicio) };
    } catch (error) {
      this.logger.error(`La base de datos no responde: ${String(error)}`);
      return { estado: 'error', latenciaMs: null };
    }
  }
}
