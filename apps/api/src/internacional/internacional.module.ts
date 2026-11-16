import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { Producto } from '../catalogo/entities/producto.entity.js';
import { PreciosModule } from '../precios/precios.module.js';
import { InternacionalController } from './internacional.controller.js';
import { InternacionalService } from './internacional.service.js';

/** Series de commodities (Banco Mundial) y, en la Etapa 4, datos por país. */
@Module({
  imports: [TypeOrmModule.forFeature([Producto, Fuente]), PreciosModule],
  controllers: [InternacionalController],
  providers: [InternacionalService],
  exports: [InternacionalService],
})
export class InternacionalModule {}
