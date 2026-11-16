import { type SerieTrmDto } from '@agroprecios/shared';
import { BadRequestException, Controller, Get, Header, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { fechaBogota, sumarDias } from '../common/fechas.js';
import { TasasService } from './tasas.service.js';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 3660;

export class ConsultaTrm {
  @ApiPropertyOptional({ example: '2026-10-17', description: 'Por defecto: hace 30 días' })
  @IsOptional()
  @Matches(PATRON_FECHA, { message: 'desde debe tener el formato AAAA-MM-DD' })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-16', description: 'Por defecto: hoy (Bogotá)' })
  @IsOptional()
  @Matches(PATRON_FECHA, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  hasta?: string;
}

class TasaDiaRespuesta {
  @ApiProperty({ example: '2026-11-16' })
  fecha: string;

  @ApiProperty({ example: '3316.700000', description: 'COP por 1 USD (texto decimal)' })
  valor: string;
}

class FuenteTrmRespuesta {
  @ApiProperty() slug: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ type: String, nullable: true }) licencia: string | null;
}

class SerieTrmRespuesta implements SerieTrmDto {
  @ApiProperty({ type: FuenteTrmRespuesta }) fuente: FuenteTrmRespuesta;
  @ApiProperty() desde: string;
  @ApiProperty() hasta: string;
  @ApiProperty({ type: TasaDiaRespuesta, isArray: true }) items: TasaDiaRespuesta[];
}

@ApiTags('tasas')
@Controller('tasas')
export class TasasController {
  constructor(private readonly tasas: TasasService) {}

  @Get('trm')
  @Header('Cache-Control', CACHE_CONTROL.catalogo)
  @ApiOperation({
    summary: 'Serie diaria de la TRM (COP por USD)',
    description: 'Fuente: Superintendencia Financiera de Colombia vía datos.gov.co, CC BY-SA 4.0.',
  })
  @ApiOkResponse({ type: SerieTrmRespuesta })
  serie(@Query() consulta: ConsultaTrm): Promise<SerieTrmDto> {
    const hasta = consulta.hasta ?? fechaBogota();
    const desde = consulta.desde ?? sumarDias(hasta, -30);
    if (desde > hasta) {
      throw new BadRequestException('desde no puede ser posterior a hasta');
    }
    if (sumarDias(desde, MAX_DIAS) < hasta) {
      throw new BadRequestException(`El rango máximo es de ${MAX_DIAS} días`);
    }
    return this.tasas.serieTrm(desde, hasta);
  }
}
