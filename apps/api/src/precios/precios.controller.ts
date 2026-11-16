import {
  type ComparativoDto,
  type ObservacionPrecioDto,
  type PreciosHoyDto,
  type SerieDisponibleDto,
  type SeriePrecioDto,
} from '@agroprecios/shared';
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard, UsuarioActual } from '../auth/admin.guard.js';
import { type UsuarioAutenticado } from '../auth/auth.service.js';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { ConsultasPreciosService } from './consultas-precios.service.js';
import {
  AnulacionPrecioCuerpo,
  CargaManualPrecioCuerpo,
  ConsultaComparativo,
  ConsultaListaAdmin,
  ConsultaProducto,
  ConsultaSerie,
  ObservacionPrecioRespuesta,
  ParametroId,
  PreciosHoyRespuesta,
} from './precios.dto.js';
import { PreciosService } from './precios.service.js';

@ApiTags('precios')
@Controller('precios')
export class PreciosController {
  constructor(private readonly consultas: ConsultasPreciosService) {}

  @Get('hoy')
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({
    summary: 'Último precio de referencia por producto (pantalla "Hoy")',
    description:
      'Incluye la variación frente al dato anterior comparable, datos complementarios ' +
      '(p. ej. Bolsa de Nueva York para el café), la cita que exige cada fuente y la TRM vigente.',
  })
  @ApiOkResponse({ type: PreciosHoyRespuesta })
  hoy(): Promise<PreciosHoyDto> {
    return this.consultas.hoy();
  }

  @Get('series')
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({
    summary: 'Series de precios disponibles para un producto',
    description:
      'Cada serie es una combinación comparable de fuente, mercado, presentación y unidad.',
  })
  @ApiOkResponse({ description: 'Lista de SerieDisponibleDto' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  series(@Query() { producto }: ConsultaProducto): Promise<SerieDisponibleDto[]> {
    return this.consultas.series(producto);
  }

  @Get('serie')
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({
    summary: 'Serie histórica de precios con mínimo, máximo y promedio del rango (RF-02)',
    description:
      'Sin fuente ni presentación usa la referencia de "Hoy". Nunca mezcla presentaciones ni unidades.',
  })
  @ApiOkResponse({ description: 'SeriePrecioDto' })
  @ApiNotFoundResponse({ description: 'No hay datos para esa serie' })
  serie(@Query() consulta: ConsultaSerie): Promise<SeriePrecioDto> {
    return this.consultas.serie(consulta);
  }

  @Get('comparativo')
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({
    summary: 'Precio de un producto en cada mercado mayorista para una fecha (RF-03)',
    description:
      'Ordenado de mayor a menor, con la diferencia en % frente al mercado de referencia de la ' +
      'región (el más cercano a Pitalito con dato ese día).',
  })
  @ApiOkResponse({ description: 'ComparativoDto' })
  comparativo(@Query() consulta: ConsultaComparativo): Promise<ComparativoDto> {
    return this.consultas.comparativo(consulta.producto, consulta.presentacion, consulta.fecha);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o es inválido' })
@UseGuards(AdminGuard)
@Controller('admin/precios')
export class AdminPreciosController {
  constructor(private readonly precios: PreciosService) {}

  @Get()
  @Header('Cache-Control', CACHE_CONTROL.sinCache)
  @ApiOperation({
    summary: 'Últimos precios registrados (por defecto, solo los cargados a mano)',
    description: 'Más recientes primero, por fecha de registro. Incluye los anulados.',
  })
  @ApiOkResponse({ type: ObservacionPrecioRespuesta, isArray: true })
  listar(@Query() consulta: ConsultaListaAdmin): Promise<ObservacionPrecioDto[]> {
    return this.precios.listar({
      limite: consulta.limite,
      producto: consulta.producto,
      soloManuales: consulta.soloManuales !== 'false',
    });
  }

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
