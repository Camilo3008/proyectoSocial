import { type SaludDto } from '@agroprecios/shared';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogoService } from '../catalogo/catalogo.service.js';
import { VERSION_API } from '../common/version.js';

@Injectable()
export class SaludService {
  private readonly logger = new Logger(SaludService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly catalogo: CatalogoService,
  ) {}

  async verificar(): Promise<SaludDto> {
    const baseDatos = await this.verificarBaseDatos();
    return {
      estado: baseDatos.estado,
      verificadoEn: new Date().toISOString(),
      version: VERSION_API,
      baseDatos,
      fuentes: baseDatos.estado === 'ok' ? await this.estadoFuentes() : [],
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

  /** Estado de cada fuente; si la consulta falla, se informa vacío (no tumba /salud). */
  private async estadoFuentes(): Promise<SaludDto['fuentes']> {
    try {
      const fuentes = await this.catalogo.listarFuentes();
      return fuentes.map(({ slug, estado, ultimaIngestaExitosa }) => ({
        slug,
        estado,
        ultimaIngestaExitosa,
      }));
    } catch (error) {
      this.logger.error(`No se pudo calcular el estado de las fuentes: ${String(error)}`);
      return [];
    }
  }
}
