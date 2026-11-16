import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasaCambio } from './entities/tasa-cambio.entity.js';
import { TasasService } from './tasas.service.js';

/** TRM y conversión de monedas. */
@Module({
  imports: [TypeOrmModule.forFeature([TasaCambio])],
  providers: [TasasService],
  exports: [TasasService],
})
export class TasasModule {}
