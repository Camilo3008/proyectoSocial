import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { TasasModule } from '../tasas/tasas.module.js';
import { FUENTE_ADAPTERS, type FuenteAdapter } from './adapters/fuente-adapter.interface.js';
import { SipsaAdapter } from './adapters/sipsa.adapter.js';
import { TrmAdapter } from './adapters/trm.adapter.js';
import { WorldBankAdapter } from './adapters/worldbank.adapter.js';
import { AdminIngestaController } from './admin-ingesta.controller.js';
import { IngestaEjecucion } from './entities/ingesta-ejecucion.entity.js';
import { IngestaProgramadaService } from './ingesta-programada.service.js';
import { IngestaService } from './ingesta.service.js';

/** Adapters por fuente, scheduler y bitácora de ingestas. */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([IngestaEjecucion, Fuente]),
    TasasModule,
    AuthModule,
  ],
  controllers: [AdminIngestaController],
  providers: [
    TrmAdapter,
    SipsaAdapter,
    WorldBankAdapter,
    // Solo fuentes verificadas en docs/fuentes. La FNC no tiene adapter: sus
    // términos prohíben la extracción automatizada (docs/fuentes/fnc.md).
    {
      provide: FUENTE_ADAPTERS,
      inject: [TrmAdapter, SipsaAdapter, WorldBankAdapter],
      useFactory: (
        trm: TrmAdapter,
        sipsa: SipsaAdapter,
        worldbank: WorldBankAdapter,
      ): FuenteAdapter[] => [trm, sipsa, worldbank],
    },
    IngestaService,
    IngestaProgramadaService,
  ],
  exports: [IngestaService],
})
export class IngestaModule {}
