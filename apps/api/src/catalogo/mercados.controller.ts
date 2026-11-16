import { type MercadoDto, type TipoMercado } from '@agroprecios/shared';
import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { TIPOS_MERCADO } from '../common/enums.js';
import { CatalogoService } from './catalogo.service.js';

export class ConsultaMercados {
  @ApiPropertyOptional({ enum: TIPOS_MERCADO })
  @IsOptional()
  @IsIn(TIPOS_MERCADO)
  tipo?: TipoMercado;
}

class MercadoRespuesta implements MercadoDto {
  @ApiProperty() id: number;
  @ApiProperty({ example: 'Neiva, Surabastos' }) nombre: string;
  @ApiProperty({ enum: TIPOS_MERCADO }) tipo: TipoMercado;
  @ApiProperty({ type: String, nullable: true, example: 'NEIVA' }) municipio: string | null;
  @ApiProperty({ type: String, nullable: true, example: 'HUILA' }) departamento: string | null;
  @ApiProperty({ example: 'COL' }) paisIso3: string;
  @ApiProperty({ type: String, nullable: true, example: 'sipsa' }) fuente: string | null;
}

@ApiTags('catálogo')
@Controller('mercados')
export class MercadosController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get()
  @Header('Cache-Control', CACHE_CONTROL.catalogo)
  @ApiOperation({ summary: 'Mercados (centrales mayoristas, bolsas, referencias)' })
  @ApiOkResponse({ type: MercadoRespuesta, isArray: true })
  listar(@Query() { tipo }: ConsultaMercados): Promise<MercadoDto[]> {
    return this.catalogo.listarMercados(tipo);
  }
}
