import { type ObservacionPrecioDto, type PreciosHoyDto } from '@agroprecios/shared';
import { Body, Controller, Get, Header, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard, UsuarioActual } from '../auth/admin.guard.js';
import { type UsuarioAutenticado } from '../auth/auth.service.js';
import { CACHE_CONTROL } from '../common/cache-control.js';
import {
  AnulacionPrecioCuerpo,
  CargaManualPrecioCuerpo,
  ObservacionPrecioRespuesta,
  ParametroId,
  PreciosHoyRespuesta,
} from './precios.dto.js';
import { PreciosService } from './precios.service.js';

@ApiTags('precios')
@Controller('precios')
export class PreciosController {
  constructor(private readonly precios: PreciosService) {}

  @Get('hoy')
  @Header('Cache-Control', CACHE_CONTROL.catalogo)
  @ApiOperation({
    summary: 'Último precio de referencia por producto (pantalla "Hoy")',
    description:
      'Incluye la variación frente al dato anterior comparable, datos complementarios ' +
      '(p. ej. Bolsa de Nueva York para el café) y la TRM vigente.',
  })
  @ApiOkResponse({ type: PreciosHoyRespuesta })
  hoy(): Promise<PreciosHoyDto> {
    return this.precios.hoy();
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o es inválido' })
@UseGuards(AdminGuard)
@Controller('admin/precios')
export class AdminPreciosController {
  constructor(private readonly precios: PreciosService) {}

  @Post()
  @Header('Cache-Control', CACHE_CONTROL.sinCache)
  @ApiOperation({
    summary: 'Carga manual de un precio',
    description:
      'Guarda el valor ORIGINAL (moneda, unidad y presentación de la fuente) y calcula COP/kg y ' +
      'USD/kg con la TRM vigente en la fecha del dato.',
  })
  @ApiCreatedResponse({ type: ObservacionPrecioRespuesta })
  @ApiConflictResponse({ description: 'Ya existe un precio activo con la misma clave' })
  cargar(
    @Body() cuerpo: CargaManualPrecioCuerpo,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ObservacionPrecioDto> {
    return this.precios.cargarManual(cuerpo, usuario);
  }

  @Patch(':id/anular')
  @Header('Cache-Control', CACHE_CONTROL.sinCache)
  @ApiOperation({ summary: 'Anula un precio con un motivo (nunca se borra)' })
  @ApiOkResponse({ type: ObservacionPrecioRespuesta })
  anular(
    @Param() { id }: ParametroId,
    @Body() { motivo }: AnulacionPrecioCuerpo,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ObservacionPrecioDto> {
    return this.precios.anular(id, motivo, usuario);
  }
}
