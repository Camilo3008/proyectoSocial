import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { FuenteRespuesta } from './catalogo.dto.js';
import { CatalogoService } from './catalogo.service.js';

@ApiTags('catálogo')
@Controller('fuentes')
export class FuentesController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get()
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({ summary: 'Fuentes de datos con su última ingesta exitosa y su estado' })
  @ApiOkResponse({ type: FuenteRespuesta, isArray: true })
  listar(): Promise<FuenteRespuesta[]> {
    return this.catalogo.listarFuentes();
  }
}
