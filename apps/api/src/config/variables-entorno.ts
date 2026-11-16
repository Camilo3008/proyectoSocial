import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Entorno {
  Desarrollo = 'development',
  Produccion = 'production',
  Pruebas = 'test',
}

/**
 * Variables de entorno de la API. Se validan al arrancar: si falta una
 * obligatoria o tiene un formato inválido, la aplicación no inicia.
 * Mantener sincronizado con .env.example.
 */
export class VariablesEntorno {
  @IsEnum(Entorno)
  NODE_ENV: Entorno = Entorno.Desarrollo;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  /** Orígenes permitidos por CORS, separados por coma. */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT = 5432;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsOptional()
  @IsString()
  DB_NAME_TEST?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  THROTTLE_TTL_MS = 60_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 120;

  /** Solo lo usa el seed para crear el administrador inicial. */
  @IsOptional()
  @IsEmail()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  ADMIN_PASSWORD?: string;

  /** Secreto para firmar los JWT del administrador. */
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  /** Duración del JWT: número + unidad (s, m, h, d). Corta por seguridad. */
  @IsString()
  @Matches(/^\d+[smhd]$/, { message: 'JWT_EXPIRES_IN debe ser como 15m, 1h o 900s' })
  JWT_EXPIRES_IN = '15m';

  /** Activa los jobs programados de ingesta (desactivar en pruebas). */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() === 'true' : value,
  )
  @IsBoolean()
  INGESTA_PROGRAMADA = true;
}

const SEGUNDOS_POR_UNIDAD = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

/** Convierte una duración como "15m" a segundos. */
export function duracionEnSegundos(duracion: string): number {
  const coincidencia = /^(\d+)([smhd])$/.exec(duracion);
  if (!coincidencia) {
    throw new Error(`Duración inválida: ${duracion}`);
  }
  return (
    Number(coincidencia[1]) *
    SEGUNDOS_POR_UNIDAD[coincidencia[2] as keyof typeof SEGUNDOS_POR_UNIDAD]
  );
}

/** Valida y tipa las variables de entorno. Lanza un error descriptivo si son inválidas. */
export function validarEntorno(config: Record<string, unknown>): VariablesEntorno {
  const variables = plainToInstance(VariablesEntorno, config, {
    exposeDefaultValues: true,
  });
  const errores = validateSync(variables, { skipMissingProperties: false });
  if (errores.length > 0) {
    const detalle = errores
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detalle}`);
  }
  return variables;
}
