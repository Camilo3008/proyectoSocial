import { Injectable } from '@nestjs/common';
import { esDecimal } from '../../common/decimal.js';
import { sumarDias } from '../../common/fechas.js';
import {
  type ContextoIngesta,
  type FuenteAdapter,
  type ResultadoAdapter,
  type TasaCambioCruda,
} from './fuente-adapter.interface.js';
import { descargarTexto, sha256 } from './http.js';

/** Recurso verificado (docs/fuentes/trm.md). */
export const URL_TRM = 'https://www.datos.gov.co/resource/32sa-8pi3.json';

/** Filas por defecto: cubre ~2 meses y rellena huecos si una ejecución falló. */
const LIMITE_POR_DEFECTO = 40;
/** Ningún rango de vigencia real supera unos pocos días (puentes festivos). */
const MAX_DIAS_VIGENCIA = 10;

const PATRON_FECHA_SOCRATA = /^(\d{4}-\d{2}-\d{2})T00:00:00(\.000)?$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

interface FilaTrm {
  valor?: unknown;
  unidad?: unknown;
  vigenciadesde?: unknown;
  vigenciahasta?: unknown;
}

/** Socrata entrega todo como texto; cualquier otro tipo se trata como vacío. */
function comoTexto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

/** Arma la URL SoQL. `desde` se valida para evitar inyección en la consulta. */
export function construirUrlTrm(contexto: ContextoIngesta = {}): string {
  const parametros = new URLSearchParams({ $order: 'vigenciadesde DESC' });
  if (contexto.desde) {
    if (!PATRON_FECHA.test(contexto.desde)) {
      throw new Error(`Fecha "desde" inválida: ${contexto.desde}`);
    }
    parametros.set('$where', `vigenciadesde >= '${contexto.desde}T00:00:00'`);
    // Holgado: desde 1991 hay ~8.700 filas; un límite menor cortaría el histórico sin avisar.
    parametros.set('$limit', '50000');
  } else {
    parametros.set('$limit', String(LIMITE_POR_DEFECTO));
  }
  return `${URL_TRM}?${parametros.toString()}`;
}

/**
 * Convierte la respuesta de datos.gov.co en una tasa USD→COP por día.
 * Cada fila tiene un rango de vigencia (fines de semana y festivos) que se
 * expande a una fila por día. Si dos rangos se solapan, gana la TRM con la
 * vigencia más reciente.
 */
export function parsearTrm(texto: string): { tasas: TasaCambioCruda[]; advertencias: string[] } {
  const datos: unknown = JSON.parse(texto);
  if (!Array.isArray(datos)) {
    throw new Error('Respuesta inesperada de la TRM: se esperaba un arreglo JSON');
  }

  const advertencias: string[] = [];
  const porFecha = new Map<string, { valor: string; vigenciaDesde: string }>();

  datos.forEach((fila: FilaTrm, indice) => {
    const desde = PATRON_FECHA_SOCRATA.exec(comoTexto(fila.vigenciadesde))?.[1];
    const hasta = PATRON_FECHA_SOCRATA.exec(comoTexto(fila.vigenciahasta))?.[1];
    const valor = comoTexto(fila.valor);

    if (fila.unidad !== 'COP') {
      advertencias.push(`Fila ${indice}: unidad "${String(fila.unidad)}" distinta de COP`);
      return;
    }
    if (!esDecimal(valor) || !desde || !hasta || hasta < desde) {
      advertencias.push(`Fila ${indice}: formato inválido (${JSON.stringify(fila)})`);
      return;
    }

    let dias = 0;
    for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
      if (++dias > MAX_DIAS_VIGENCIA) {
        advertencias.push(`Fila ${indice}: vigencia de más de ${MAX_DIAS_VIGENCIA} días`);
        break;
      }
      const actual = porFecha.get(fecha);
      if (!actual || desde > actual.vigenciaDesde) {
        porFecha.set(fecha, { valor, vigenciaDesde: desde });
      }
    }
  });

  const tasas = [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, { valor }]) => ({ fecha, monedaOrigen: 'USD', monedaDestino: 'COP', valor }));

  return { tasas, advertencias };
}

/** TRM diaria de la Superintendencia Financiera (datos.gov.co, dataset 32sa-8pi3). */
@Injectable()
export class TrmAdapter implements FuenteAdapter {
  readonly slug = 'trm';

  async ejecutar(contexto: ContextoIngesta): Promise<ResultadoAdapter> {
    const texto = await descargarTexto(construirUrlTrm(contexto), contexto.signal);
    const { tasas, advertencias } = parsearTrm(texto);
    return { observaciones: [], tasas, advertencias, payloadHash: sha256(texto) };
  }
}
