import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionPrecio } from './entities/observacion-precio.entity.js';
import { PreciosService } from './precios.service.js';

/** Observaciones de precio y sus consultas. */
@Module({
  imports: [TypeOrmModule.forFeature([ObservacionPrecio])],
  providers: [PreciosService],
  exports: [PreciosService],
})
export class PreciosModule {}
