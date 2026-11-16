import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FUENTE_ADAPTERS, type FuenteAdapter } from './adapters/fuente-adapter.interface.js';
import { IngestaEjecucion } from './entities/ingesta-ejecucion.entity.js';
import { IngestaService } from './ingesta.service.js';

/** Adapters por fuente, scheduler y bitácora de ingestas. */
@Module({
  imports: [TypeOrmModule.forFeature([IngestaEjecucion])],
  providers: [
    // Los adapters se agregan aquí a medida que se verifica cada fuente.
    { provide: FUENTE_ADAPTERS, useValue: [] satisfies FuenteAdapter[] },
    IngestaService,
  ],
  exports: [IngestaService],
})
export class IngestaModule {}
