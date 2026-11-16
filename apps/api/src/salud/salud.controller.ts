import { Controller, Get, Header, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Response } from 'express';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { SaludRespuesta } from './salud.dto.js';
import { SaludService } from './salud.service.js';

@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly saludService: SaludService) {}

  @Get()
  @SkipThrottle()
  @Header('Cache-Control', CACHE_CONTROL.sinCache)
  @ApiOperation({
    summary: 'Estado de la API, de la base de datos y de la ingesta de cada fuente',
  })
  @ApiOkResponse({ type: SaludRespuesta })
  @ApiServiceUnavailableResponse({ type: SaludRespuesta, description: 'Algún componente falla' })
  async obtener(@Res({ passthrough: true }) res: Response): Promise<SaludRespuesta> {
    const salud = await this.saludService.verificar();
    if (salud.estado !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return salud;
  }
}
