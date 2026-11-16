import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aTexto, decimal, esDecimal } from '../../common/decimal.js';
import { VariablesEntorno } from '../../config/variables-entorno.js';
import {
  type ContextoIngesta,
  type FuenteAdapter,
  type ObservacionPrecioCruda,
  type ResultadoAdapter,
} from './fuente-adapter.interface.js';
import { USER_AGENT } from './http.js';
import { type FilaXlsx, leerHojaXlsx } from './xlsx.js';

/** Página oficial donde siempre está el enlace vigente (docs/fuentes/worldbank.md). */
export const PAGINA_WORLDBANK = 'https://www.worldbank.org/en/research/commodity-markets';
const NOMBRE_ARCHIVO = 'CMO-Historical-Data-Monthly.xlsx';
const HOJA = 'Monthly Prices';
const UNIDAD_ESPERADA = '($/kg)';
const PATRON_PERIODO = /^(\d{4})M(\d{2})$/;

export interface ResultadoLibro {
  observaciones: ObservacionPrecioCruda[];
  advertencias: string[];
  /** Texto "Updated on …" de la hoja, para trazabilidad. */
  actualizado: string | null;
}

/**
 * Convierte la hoja "Monthly Prices" en observaciones mensuales en USD/kg.
 * El código de cada serie es el encabezado exacto de su columna.
 */
export function procesarLibroWorldBank(
  filas: FilaXlsx[],
  filtro: { codigos?: ReadonlySet<string>; desde?: string } = {},
): ResultadoLibro {
  const advertencias: string[] = [];
  const encabezado = filas.find((f) =>
    [...f.celdas.values()].some((v) => v.startsWith('Coffee, Arabica')),
  );
  if (!encabezado) {
    throw new Error(`La hoja "${HOJA}" no tiene la fila de encabezados esperada`);
  }
  const unidades = filas.find((f) => f.numero === encabezado.numero + 1);
  const actualizado =
    filas
      .slice(0, encabezado.numero)
      .flatMap((f) => [...f.celdas.values()])
      .find((v) => v.startsWith('Updated on')) ?? null;

  // Columnas a leer: las mapeadas (o todas) cuya unidad sea $/kg.
  const columnas = new Map<string, string>();
  for (const [columna, nombre] of encabezado.celdas) {
    const codigo = nombre.trim();
    if (filtro.codigos && !filtro.codigos.has(codigo)) continue;
    const unidad = unidades?.celdas.get(columna)?.trim();
    if (unidad !== UNIDAD_ESPERADA) {
      if (filtro.codigos) {
        advertencias.push(
          `La serie "${codigo}" viene en ${unidad ?? '¿?'} y no en ${UNIDAD_ESPERADA}`,
        );
      }
      continue;
    }
    columnas.set(columna, codigo);
  }
  for (const codigo of filtro.codigos ?? []) {
    if (
      ![...columnas.values()].includes(codigo) &&
      !advertencias.some((a) => a.includes(`"${codigo}"`))
    ) {
      advertencias.push(`La serie "${codigo}" no está en el archivo`);
    }
  }

  const observaciones: ObservacionPrecioCruda[] = [];
  for (const fila of filas) {
    if (fila.numero <= encabezado.numero + 1) continue;
    const periodo = PATRON_PERIODO.exec(fila.celdas.get('A') ?? '');
    if (!periodo) continue;
    const fecha = `${periodo[1]}-${periodo[2]}-01`;
    if (filtro.desde && fecha < filtro.desde) continue;

    for (const [columna, codigo] of columnas) {
      const crudo = fila.celdas.get(columna);
      // Los faltantes vienen como "…" (o "..."): no son advertencias.
      if (!crudo || !esDecimal(crudo)) continue;
      observaciones.push({
        codigoExterno: codigo,
        fecha,
        periodicidad: 'MENSUAL',
        presentacion: codigo,
        // Normaliza la representación binaria ("1.0900000000000001" -> "1.0900").
        valor: aTexto(decimal(crudo), 4),
        moneda: 'USD',
        unidad: 'kg',
        // Sin "Updated on…": cambia cada mes y marcaría todas las filas como actualizadas.
        metadata: { serie: codigo, periodo: `${periodo[1]}M${periodo[2]}` },
      });
    }
  }
  return { observaciones, advertencias, actualizado };
}

/** Busca el enlace vigente al XLSX mensual en la página oficial. */
export function buscarEnlaceEnPagina(html: string): string | null {
  const coincidencia = new RegExp(
    `href="(https://[^"]+/${NOMBRE_ARCHIVO.replace(/\./g, '\\.')})"`,
  ).exec(html);
  return coincidencia?.[1] ?? null;
}

/** Precios internacionales mensuales del Banco Mundial (Pink Sheet). */
@Injectable()
export class WorldBankAdapter implements FuenteAdapter {
  readonly slug = 'worldbank';
  readonly timeoutMs = 2 * 60_000;

  constructor(private readonly config: ConfigService<VariablesEntorno, true>) {}

  async ejecutar(contexto: ContextoIngesta): Promise<ResultadoAdapter> {
    const advertencias: string[] = [];
    let url = this.config.get('WORLDBANK_URL', { infer: true });
    let respuesta = await this.descargar(url, contexto.signal);

    // La URL cambia con el tiempo: si ya no existe, se busca la vigente en la página oficial.
    if (respuesta.status === 404) {
      const pagina = await this.descargar(PAGINA_WORLDBANK, contexto.signal);
      if (!pagina.ok)
        throw new Error(`La página del Banco Mundial respondió HTTP ${pagina.status}`);
      const nueva = buscarEnlaceEnPagina(await pagina.text());
      if (!nueva) throw new Error('No se encontró el enlace al XLSX mensual en la página oficial');
      advertencias.push(`WORLDBANK_URL ya no existe; se usó ${nueva}. Actualice la variable.`);
      url = nueva;
      respuesta = await this.descargar(url, contexto.signal);
    }
    if (!respuesta.ok) {
      throw new Error(
        `El Banco Mundial respondió HTTP ${respuesta.status} ${respuesta.statusText}`,
      );
    }

    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    const resultado = procesarLibroWorldBank(leerHojaXlsx(bytes, HOJA), {
      codigos: contexto.codigos,
      desde: contexto.desde,
    });
    return {
      observaciones: resultado.observaciones,
      advertencias: [...advertencias, ...resultado.advertencias],
      payloadHash: createHash('sha256').update(bytes).digest('hex'),
    };
  }

  private descargar(url: string, signal?: AbortSignal): Promise<Response> {
    return fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal });
  }
}
