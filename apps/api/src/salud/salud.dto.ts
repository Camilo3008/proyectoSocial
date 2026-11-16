import { type EstadoComponente, type SaludDto } from '@agroprecios/shared';
import { ApiProperty } from '@nestjs/swagger';

const ESTADOS: EstadoComponente[] = ['ok', 'error'];

export class EstadoBaseDatosRespuesta {
  @ApiProperty({ enum: ESTADOS })
  estado: EstadoComponente;

  @ApiProperty({ type: Number, nullable: true, description: 'Latencia de un SELECT 1, en ms' })
  latenciaMs: number | null;
}

export class SaludRespuesta implements SaludDto {
  @ApiProperty({ enum: ESTADOS })
  estado: EstadoComponente;

  @ApiProperty({ example: '2026-11-15T13:00:00.000Z' })
  verificadoEn: string;

  @ApiProperty({ example: '0.1.0' })
  version: string;

  @ApiProperty({ type: EstadoBaseDatosRespuesta })
  baseDatos: EstadoBaseDatosRespuesta;
}
