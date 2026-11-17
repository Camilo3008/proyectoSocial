import { plainToInstance, Transform, Type } from 'class-transformer';
import { CronTime } from 'cron';
import { ZONA_NEGOCIO } from '../common/fechas.js';
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

  /**
   * Número de proxies inversos de confianza delante de la API (0 = ninguno).
   * Con Caddy delante va en 1: así req.ip (y el límite de peticiones por IP)
   * usa la IP real del cliente de X-Forwarded-For y no la del proxy.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY = 0;

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

  /**
   * Horario de la ingesta TRM (cron con segundos, zona America/Bogota).
   * Por defecto 07:30 y 18:30 todos los días.
   */
  @IsString()
  TRM_CRON = '0 30 7,18 * * *';

  /**
   * Horario de la ingesta SIPSA (cron con segundos, zona America/Bogota).
   * Por defecto 15:30 de lunes a sábado (el DANE actualiza a las 2:00 p. m.).
   */
  @IsString()
  SIPSA_CRON = '0 30 15 * * 1-6';

  /** Días hacia atrás que conserva cada ingesta SIPSA (la respuesta trae todo desde 2020). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4000)
  SIPSA_DIAS_VENTANA = 45;

  /**
   * Horario de la ingesta del Banco Mundial (cron con segundos, zona America/Bogota).
   * Por defecto los lunes a las 9:00 (el archivo se actualiza a comienzos de mes).
   */
  @IsString()
  WORLDBANK_CRON = '0 0 9 * * 1';

  /**
   * XLSX mensual del Pink Sheet (docs/fuentes/worldbank.md). Si deja de existir,
   * el adapter busca el enlace vigente en la página oficial y lo advierte.
   */
  @IsString()
  @Matches(/^https:\/\/[^\s]+\.xlsx$/, {
    message: 'WORLDBANK_URL debe ser una URL https a un .xlsx',
  })
  WORLDBANK_URL =
    'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx';

  /**
   * Horario de la ingesta de FAOSTAT (cron con segundos, zona America/Bogota).
   * Por defecto el día 1 de cada mes a las 10:00: los datos son anuales.
   */
  @IsString()
  FAOSTAT_CRON = '0 0 10 1 * *';

  /** Descarga masiva de Producer Prices (docs/fuentes/faostat.md). */
  @IsString()
  @Matches(/^https:\/\/[^\s]+\.zip$/, { message: 'FAOSTAT_URL debe ser una URL https a un .zip' })
  FAOSTAT_URL = 'https://bulks-faostat.fao.org/production/Prices_E_All_Data_(Normalized).zip';
}

const VARIABLES_CRON = ['TRM_CRON', 'SIPSA_CRON', 'WORLDBANK_CRON', 'FAOSTAT_CRON'] as const;

/** Devuelve un mensaje de error si la expresión cron no es válida. */
function validarCron(expresion: string): string | null {
  try {
    new CronTime(expresion, ZONA_NEGOCIO);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
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
  const errores = validateSync(variables, { skipMissingProperties: false }).map(
    (e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
  );
  for (const nombre of VARIABLES_CRON) {
    const problema = typeof variables[nombre] === 'string' ? validarCron(variables[nombre]) : null;
    if (problema) {
      errores.push(`  - ${nombre}: expresión cron inválida (${problema})`);
    }
  }
  if (errores.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n${errores.join('\n')}`);
  }
  return variables;
}
