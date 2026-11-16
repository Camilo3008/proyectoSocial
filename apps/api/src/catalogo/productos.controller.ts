import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { ProductoRespuesta } from './catalogo.dto.js';
import { CatalogoService } from './catalogo.service.js';

@ApiTags('catálogo')
@Controller('productos')
export class ProductosController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get()
  @Header('Cache-Control', CACHE_CONTROL.catalogo)
  @ApiOperation({ summary: 'Catálogo de productos activos' })
  @ApiOkResponse({ type: ProductoRespuesta, isArray: true })
  listar(): Promise<ProductoRespuesta[]> {
    return this.catalogo.listarProductos();
  }
}
