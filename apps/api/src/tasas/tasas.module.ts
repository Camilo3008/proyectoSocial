import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { TasaCambio } from './entities/tasa-cambio.entity.js';
import { TasasController } from './tasas.controller.js';
import { TasasService } from './tasas.service.js';

/** TRM y conversión de monedas. */
@Module({
  imports: [TypeOrmModule.forFeature([TasaCambio, Fuente])],
  controllers: [TasasController],
  providers: [TasasService],
  exports: [TasasService],
})
export class TasasModule {}
