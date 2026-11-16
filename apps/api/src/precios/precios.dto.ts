import {
  type AnulacionPrecioDto,
  type CargaManualPrecioDto,
  type ComplementoPrecioDto,
  type Frecuencia,
  type ObservacionPrecioDto,
  type PrecioHoyItemDto,
  type PreciosHoyDto,
  type VariacionDto,
} from '@agroprecios/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FRECUENCIAS } from '../common/enums.js';
import { UNIDADES } from '../common/unidades.js';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const UNIDADES_CONOCIDAS = Object.keys(UNIDADES);

/**
 * Rechaza el carácter de reemplazo U+FFFD: aparece cuando el cliente envía texto
 * que no es UTF-8 (p. ej. "arábica" desde una consola en Windows-1252).
 */
const SIN_CARACTER_INVALIDO = /^[^\uFFFD]*$/;
const MENSAJE_UTF8 = '$property contiene caracteres inválidos: envíe el texto en UTF-8';

export class CargaManualPrecioCuerpo implements CargaManualPrecioDto {
  @ApiProperty({ example: 'cafe' })
  @Matches(/^[a-z0-9-]{2,50}$/)
  producto: string;

  @ApiProperty({ example: 'fnc', description: 'Fuente de la que se tomó el dato' })
  @Matches(/^[a-z0-9-]{2,30}$/)
  fuente: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mercadoId?: number;

  @ApiPropertyOptional({ example: 'COL' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  paisIso3?: string;

  @ApiProperty({ example: '2026-11-13' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener el formato AAAA-MM-DD' })
  fecha: string;

  @ApiPropertyOptional({ enum: FRECUENCIAS, default: 'DIARIA' })
  @IsOptional()
  @IsIn(FRECUENCIAS)
  periodicidad?: Frecuencia;

  @ApiProperty({ example: 'pergamino seco' })
  @Transform(recortar)
  @IsString()
  @Matches(SIN_CARACTER_INVALIDO, { message: MENSAJE_UTF8 })
  @MinLength(2)
  @MaxLength(100)
  presentacion: string;

  @ApiProperty({ example: '2075000', description: 'Texto decimal con punto, hasta 4 decimales' })
  @Matches(/^\d{1,14}(\.\d{1,4})?$/, {
    message: 'valor debe ser un número positivo con punto decimal (ej. 2075000 o 278.65)',
  })
  valor: string;

  @ApiProperty({ example: 'COP' })
  @Matches(/^[A-Z]{3}$/, { message: 'moneda debe ser un código ISO 4217 (ej. COP, USD)' })
  moneda: string;

  @ApiProperty({ example: 'carga 125 kg', enum: UNIDADES_CONOCIDAS })
  @IsIn(UNIDADES_CONOCIDAS)
  unidad: string;

  @ApiPropertyOptional({ example: 'Boletín FNC del 13/11/2026' })
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @Matches(SIN_CARACTER_INVALIDO, { message: MENSAJE_UTF8 })
  @MaxLength(300)
  referencia?: string;
}

export class AnulacionPrecioCuerpo implements AnulacionPrecioDto {
  @ApiProperty({ example: 'Valor digitado con un cero de más' })
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @Matches(SIN_CARACTER_INVALIDO, { message: MENSAJE_UTF8 })
  @MinLength(5)
  @MaxLength(500)
  motivo: string;
}

export class ParametroId {
  @ApiProperty({ example: '1' })
  @Matches(/^\d{1,18}$/)
  id: string;
}

class Referencia {
  @ApiProperty() slug: string;
  @ApiProperty() nombre: string;
}

class MercadoRef {
  @ApiProperty() id: number;
  @ApiProperty() nombre: string;
}

export class FuenteDatoRespuesta {
  @ApiProperty() slug: string;
  @ApiProperty() nombre: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Cita que exige la licencia de la fuente',
  })
  cita: string | null;
}

class MercadoConId {
  @ApiProperty() id: number;
  @ApiProperty() nombre: string;
}

export class ObservacionPrecioRespuesta implements ObservacionPrecioDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: Referencia }) producto: Referencia;
  @ApiProperty({ type: Referencia }) fuente: Referencia;
  @ApiProperty({ type: MercadoConId, nullable: true }) mercado: MercadoConId | null;
  @ApiProperty({ type: String, nullable: true }) paisIso3: string | null;
  @ApiProperty() fecha: string;
  @ApiProperty({ enum: FRECUENCIAS }) periodicidad: Frecuencia;
  @ApiProperty() presentacion: string;
  @ApiProperty() valor: string;
  @ApiProperty() moneda: string;
  @ApiProperty() unidad: string;
  @ApiProperty({ type: String, nullable: true }) valorCopKg: string | null;
  @ApiProperty({ type: String, nullable: true }) valorUsdKg: string | null;
  @ApiProperty() anulado: boolean;
  @ApiProperty({ type: String, nullable: true }) motivoAnulacion: string | null;
  @ApiProperty() creadoEn: string;
}

class VariacionRespuesta implements VariacionDto {
  @ApiProperty({ example: '25000.0000' }) absoluta: string;
  @ApiProperty({ type: String, nullable: true, example: '1.22' }) porcentaje: string | null;
  @ApiProperty({ example: '2026-11-12' }) fechaAnterior: string;
}

class ComplementoRespuesta implements ComplementoPrecioDto {
  @ApiProperty() etiqueta: string;
  @ApiProperty({ type: FuenteDatoRespuesta }) fuente: FuenteDatoRespuesta;
  @ApiProperty({ type: MercadoRef, nullable: true }) mercado: MercadoRef | null;
  @ApiProperty() fecha: string;
  @ApiProperty({ enum: FRECUENCIAS }) periodicidad: Frecuencia;
  @ApiProperty() presentacion: string;
  @ApiProperty() valor: string;
  @ApiProperty() moneda: string;
  @ApiProperty() unidad: string;
  @ApiProperty({ type: String, nullable: true }) valorCopKg: string | null;
  @ApiProperty({ type: VariacionRespuesta, nullable: true }) variacion: VariacionRespuesta | null;
}

class PrecioHoyItemRespuesta implements PrecioHoyItemDto {
  @ApiProperty({ type: Referencia }) producto: Referencia;
  @ApiProperty({ type: FuenteDatoRespuesta }) fuente: FuenteDatoRespuesta;
  @ApiProperty({ type: MercadoRef, nullable: true }) mercado: MercadoRef | null;
  @ApiProperty() fecha: string;
  @ApiProperty({ enum: FRECUENCIAS }) periodicidad: Frecuencia;
  @ApiProperty() presentacion: string;
  @ApiProperty() valor: string;
  @ApiProperty() moneda: string;
  @ApiProperty() unidad: string;
  @ApiProperty({ type: String, nullable: true }) valorCopKg: string | null;
  @ApiProperty({ type: VariacionRespuesta, nullable: true }) variacion: VariacionRespuesta | null;
  @ApiProperty({ type: ComplementoRespuesta, isArray: true }) complementos: ComplementoRespuesta[];
}

class FuenteConLicencia extends Referencia {
  @ApiProperty({ type: String, nullable: true }) licencia: string | null;
}

class TrmHoyRespuesta {
  @ApiProperty() fecha: string;
  @ApiProperty() valor: string;
  @ApiProperty({ type: FuenteConLicencia }) fuente: FuenteConLicencia;
}

export class PreciosHoyRespuesta implements PreciosHoyDto {
  @ApiProperty() generadoEn: string;
  @ApiProperty({ example: '2026-11-16' }) hoy: string;
  @ApiProperty({ type: PrecioHoyItemRespuesta, isArray: true }) items: PrecioHoyItemRespuesta[];
  @ApiProperty({ type: Referencia, isArray: true }) sinDatos: Referencia[];
  @ApiProperty({ type: TrmHoyRespuesta, nullable: true }) trm: TrmHoyRespuesta | null;
}

export class ConsultaProducto {
  @ApiProperty({ example: 'platano' })
  @Matches(/^[a-z0-9-]{2,50}$/)
  producto: string;
}

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class ConsultaSerie extends ConsultaProducto {
  @ApiPropertyOptional({
    example: 'sipsa',
    description: 'Con presentacion; sin ellas se usa la referencia de "Hoy"',
  })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,30}$/)
  fuente?: string;

  @ApiPropertyOptional({ example: 7, description: 'Id del mercado (GET /api/mercados)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mercado?: number;

  @ApiPropertyOptional({ example: 'hartón verde' })
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(100)
  presentacion?: string;

  @ApiPropertyOptional({
    example: '2026-10-14',
    description: 'Por defecto: 30 días antes de "hasta"',
  })
  @IsOptional()
  @Matches(PATRON_FECHA, { message: 'desde debe tener el formato AAAA-MM-DD' })
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-11-13',
    description: 'Por defecto: último dato de la serie',
  })
  @IsOptional()
  @Matches(PATRON_FECHA, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  hasta?: string;
}

export class ConsultaComparativo extends ConsultaProducto {
  @ApiPropertyOptional({ example: 'hartón verde' })
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(100)
  presentacion?: string;

  @ApiPropertyOptional({ example: '2026-11-13', description: 'Por defecto: último día con datos' })
  @IsOptional()
  @Matches(PATRON_FECHA, { message: 'fecha debe tener el formato AAAA-MM-DD' })
  fecha?: string;
}
