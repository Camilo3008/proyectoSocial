import {
  type EstadoComponente,
  type EstadoFuente,
  type SaludDto,
  type SaludFuenteDto,
} from '@agroprecios/shared';
import { ApiProperty } from '@nestjs/swagger';

const ESTADOS: EstadoComponente[] = ['ok', 'error'];
const ESTADOS_FUENTE: EstadoFuente[] = ['AL_DIA', 'ATRASADA', 'ERROR', 'SIN_DATOS', 'NO_APLICA'];

export class EstadoBaseDatosRespuesta {
  @ApiProperty({ enum: ESTADOS })
  estado: EstadoComponente;

  @ApiProperty({ type: Number, nullable: true, description: 'Latencia de un SELECT 1, en ms' })
  latenciaMs: number | null;
}

export class SaludFuenteRespuesta implements SaludFuenteDto {
  @ApiProperty({ example: 'trm' })
  slug: string;

  @ApiProperty({ enum: ESTADOS_FUENTE })
  estado: EstadoFuente;

  @ApiProperty({ type: String, nullable: true, example: '2026-11-16T12:00:00.000Z' })
  ultimaIngestaExitosa: string | null;
}

export class SaludRespuesta implements SaludDto {
  @ApiProperty({ enum: ESTADOS, description: 'Solo depende de la base de datos' })
  estado: EstadoComponente;

  @ApiProperty({ example: '2026-11-15T13:00:00.000Z' })
  verificadoEn: string;

  @ApiProperty({ example: '0.1.0' })
  version: string;

  @ApiProperty({ type: EstadoBaseDatosRespuesta })
  baseDatos: EstadoBaseDatosRespuesta;

  @ApiProperty({ type: SaludFuenteRespuesta, isArray: true })
  fuentes: SaludFuenteRespuesta[];
}
