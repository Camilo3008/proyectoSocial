import {
  type DisparoIngesta,
  type EstadoIngesta,
  type IngestaEjecucionDto,
} from '@agroprecios/shared';
import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard.js';
import { CACHE_CONTROL } from '../common/cache-control.js';
import { DISPAROS_INGESTA, ESTADOS_INGESTA } from '../common/enums.js';
import { IngestaService } from './ingesta.service.js';

const PATRON_SLUG = /^[a-z0-9-]{2,30}$/;

export class ParametroFuente {
  @ApiProperty({ example: 'trm' })
  @Matches(PATRON_SLUG)
  fuente: string;
}

export class ConsultaEjecucion {
  @ApiPropertyOptional({
    example: '2020-01-01',
    description: 'Fecha mínima de los datos. Por defecto, la ventana configurada de la fuente.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener el formato AAAA-MM-DD' })
  desde?: string;
}

export class ConsultaBitacora {
  @ApiPropertyOptional({ example: 'trm' })
  @IsOptional()
  @Matches(PATRON_SLUG)
  fuente?: string;

  @ApiPropertyOptional({ enum: ESTADOS_INGESTA })
  @IsOptional()
  @IsIn(ESTADOS_INGESTA)
  estado?: EstadoIngesta;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limite?: number;
}

class IngestaEjecucionRespuesta implements IngestaEjecucionDto {
  @ApiProperty() id: number;
  @ApiProperty({ example: 'trm' }) fuente: string;
  @ApiProperty({ enum: DISPAROS_INGESTA }) disparo: DisparoIngesta;
  @ApiProperty() inicio: string;
  @ApiProperty({ type: String, nullable: true }) fin: string | null;
  @ApiProperty({ enum: ESTADOS_INGESTA }) estado: EstadoIngesta;
  @ApiProperty() leidos: number;
  @ApiProperty() insertados: number;
  @ApiProperty() actualizados: number;
  @ApiProperty() mercadosNuevos: number;
  @ApiProperty({ type: String, nullable: true }) error: string | null;
  @ApiProperty({ type: String, nullable: true }) payloadHash: string | null;
}

@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o es inválido' })
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminIngestaController {
  constructor(private readonly ingesta: IngestaService) {}

  @Post('ingesta/:fuente')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', CACHE_CONTROL.sinCache)
  @ApiOperation({
    summary: 'Ejecuta ahora la ingesta de una fuente',
    description: 'Devuelve la ejecución registrada en la bitácora (también si terminó en ERROR).',
  })
  @ApiOkResponse({ type: IngestaEjecucionRespuesta })
  ejecutar(
    @Param() { fuente }: ParametroFuente,
    @Query() { desde }: ConsultaEjecucion,
  ): Promise<IngestaEjecucionDto> {
    return this.ingesta.ejecutar(fuente, 'MANUAL', { desde });
  }

  @Get('ingestas')
  @Header('Cache-Control', CACHE_CONTROL.sinCache)
  @ApiOperation({ summary: 'Bitácora de ingestas (más recientes primero)' })
  @ApiOkResponse({ type: IngestaEjecucionRespuesta, isArray: true })
  bitacora(@Query() consulta: ConsultaBitacora): Promise<IngestaEjecucionDto[]> {
    return this.ingesta.bitacora(consulta);
  }
}
