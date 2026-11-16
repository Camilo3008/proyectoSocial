import { type CommoditiesDto } from '@agroprecios/shared';
import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { InternacionalService } from './internacional.service.js';

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

@ApiTags('internacional')
@Controller('internacional')
export class InternacionalController {
  constructor(private readonly internacional: InternacionalService) {}

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
}
