import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoService } from './catalogo.service.js';
import { Fuente } from './entities/fuente.entity.js';
import { Mercado } from './entities/mercado.entity.js';
import { Pais } from './entities/pais.entity.js';
import { ProductoFuente } from './entities/producto-fuente.entity.js';
import { Producto } from './entities/producto.entity.js';
import { FuentesController } from './fuentes.controller.js';
import { ProductosController } from './productos.controller.js';

/** Productos, fuentes, mercados y países. */
@Module({
  imports: [TypeOrmModule.forFeature([Producto, Fuente, Pais, Mercado, ProductoFuente])],
  controllers: [ProductosController, FuentesController],
  providers: [CatalogoService],
  exports: [CatalogoService, TypeOrmModule],
})
export class CatalogoModule {}
