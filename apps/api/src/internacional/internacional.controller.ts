import { type CommoditiesDto, type DetallePaisDto, type MapaPaisesDto } from '@agroprecios/shared';
import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { InternacionalService } from './internacional.service.js';
import { PaisesService } from './paises.service.js';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class ConsultaCommodities {
  @ApiProperty({ example: 'cafe' })
  @Matches(/^[a-z0-9-]{2,50}$/)
  producto: string;

  @ApiPropertyOptional({
    example: '2024-11-01',
    description: 'Por defecto: 24 meses antes de "hasta"',
  })
  @IsOptional()
  @Matches(PATRON_FECHA, { message: 'desde debe tener el formato AAAA-MM-DD' })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Por defecto: último mes con datos' })
  @IsOptional()
  @Matches(PATRON_FECHA, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  hasta?: string;
}

export class ConsultaPaises {
  @ApiProperty({ example: 'cafe' })
  @Matches(/^[a-z0-9-]{2,50}$/)
  producto: string;

  @ApiPropertyOptional({ example: 2024, description: 'Por defecto: último año con datos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  anio?: number;
}

export class ConsultaDetallePais {
  @ApiProperty({ example: 'cafe' })
  @Matches(/^[a-z0-9-]{2,50}$/)
  producto: string;
}

export class ParametroIso3 {
  @ApiProperty({ example: 'BRA' })
  @Matches(/^[A-Z]{3}$/, { message: 'iso3 debe ser un código ISO 3166-1 alfa-3 en mayúsculas' })
  iso3: string;
}

@ApiTags('internacional')
@Controller('internacional')
export class InternacionalController {
  constructor(
    private readonly internacional: InternacionalService,
    private readonly paises: PaisesService,
  ) {}

  @Get('commodities')
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({
    summary: 'Precios internacionales mensuales (Banco Mundial) y el precio nacional para comparar',
    description:
      'Series en USD/kg y COP/kg (TRM promedio del mes). La referencia nacional es el promedio ' +
      'mensual de la serie de "Hoy"; son presentaciones distintas y solo se comparan como tendencia.',
  })
  @ApiOkResponse({ description: 'CommoditiesDto' })
  @ApiNotFoundResponse({ description: 'Producto sin precios internacionales' })
  commodities(@Query() consulta: ConsultaCommodities): Promise<CommoditiesDto> {
    return this.internacional.commodities(consulta.producto, consulta.desde, consulta.hasta);
  }

  @Get('paises')
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({
    summary: 'Precio al productor por país en un año (FAOSTAT), para la coropleta del globo',
    description: 'Valores anuales en USD/kg (y el original en USD/t). Rezago de unos dos años.',
  })
  @ApiOkResponse({ description: 'MapaPaisesDto' })
  mapa(@Query() consulta: ConsultaPaises): Promise<MapaPaisesDto> {
    return this.paises.mapa(consulta.producto, consulta.anio);
  }

  @Get('paises/:iso3')
  @Header('Cache-Control', CACHE_CONTROL.datos)
  @ApiOperation({ summary: 'Detalle de un país: serie anual y comparación con Colombia' })
  @ApiOkResponse({ description: 'DetallePaisDto' })
  @ApiNotFoundResponse({ description: 'País o producto inexistente' })
  detalle(
    @Param() { iso3 }: ParametroIso3,
    @Query() { producto }: ConsultaDetallePais,
  ): Promise<DetallePaisDto> {
    return this.paises.detalle(iso3, producto);
  }
}
