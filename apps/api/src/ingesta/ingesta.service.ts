import { Inject, Injectable } from '@nestjs/common';
import { FUENTE_ADAPTERS, type FuenteAdapter } from './adapters/fuente-adapter.interface.js';

/**
 * Orquesta las ingestas: ejecuta el adapter de una fuente, normaliza, hace el
 * upsert idempotente en su propia transacción y registra la ejecución en
 * ingesta_ejecucion. La lógica se implementa a partir de la Etapa 1.
 */
@Injectable()
export class IngestaService {
  constructor(@Inject(FUENTE_ADAPTERS) private readonly adapters: FuenteAdapter[]) {}

  /** Slugs de las fuentes que tienen adapter registrado. */
  fuentesConAdapter(): string[] {
    return this.adapters.map((adapter) => adapter.slug);
  }
}
