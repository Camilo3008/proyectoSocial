import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { Producto } from '../catalogo/entities/producto.entity.js';
import { TasasModule } from '../tasas/tasas.module.js';
import { ConsultasPreciosService } from './consultas-precios.service.js';
import { ObservacionPrecio } from './entities/observacion-precio.entity.js';
import { AdminPreciosController, PreciosController } from './precios.controller.js';
import { PreciosService } from './precios.service.js';

/** Observaciones de precio: consultas públicas y carga manual. */
@Module({
  imports: [
    TypeOrmModule.forFeature([ObservacionPrecio, Producto, Fuente]),
    TasasModule,
    AuthModule,
  ],
  controllers: [PreciosController, AdminPreciosController],
  providers: [PreciosService, ConsultasPreciosService],
  exports: [PreciosService, ConsultasPreciosService],
})
export class PreciosModule {}
