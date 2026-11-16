import {
  type EstadoFuente,
  type Frecuencia,
  type FuenteDto,
  type ProductoDto,
  type TipoFuente,
} from '@agroprecios/shared';
import { ApiProperty } from '@nestjs/swagger';
import { FRECUENCIAS, TIPOS_FUENTE } from '../common/enums.js';

const ESTADOS_FUENTE: EstadoFuente[] = ['AL_DIA', 'ATRASADA', 'ERROR', 'SIN_DATOS', 'NO_APLICA'];

export class ProductoRespuesta implements ProductoDto {
  @ApiProperty({ example: 'cafe' })
  slug: string;

  @ApiProperty({ example: 'Café' })
  nombre: string;

  @ApiProperty({ type: String, nullable: true })
  descripcion: string | null;

  @ApiProperty({ example: 'kg' })
  unidadBase: string;
}

export class FuenteRespuesta implements FuenteDto {
  @ApiProperty({ example: 'fnc' })
  slug: string;

  @ApiProperty({ example: 'Federación Nacional de Cafeteros' })
  nombre: string;

  @ApiProperty({ enum: TIPOS_FUENTE })
  tipo: TipoFuente;

  @ApiProperty({ type: String, nullable: true })
  url: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'null = por verificar' })
  licencia: string | null;

  @ApiProperty({ enum: FRECUENCIAS })
  frecuencia: Frecuencia;

  @ApiProperty({ type: String, nullable: true, example: '2026-11-14T13:00:00.000Z' })
  ultimaIngestaExitosa: string | null;

  @ApiProperty({ enum: ESTADOS_FUENTE })
  estado: EstadoFuente;
}
