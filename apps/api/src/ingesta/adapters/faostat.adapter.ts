import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Unzip, UnzipInflate } from 'fflate';
import paises from 'i18n-iso-countries';
import { aTexto, decimal, esDecimal } from '../../common/decimal.js';
import { VariablesEntorno } from '../../config/variables-entorno.js';
import {
  type ContextoIngesta,
  type FuenteAdapter,
  type ObservacionPrecioCruda,
  type ResultadoAdapter,
} from './fuente-adapter.interface.js';
import { USER_AGENT } from './http.js';

/** Archivo de datos dentro del ZIP (docs/fuentes/faostat.md). */
export const ARCHIVO_CSV = 'Prices_E_All_Data_(Normalized).csv';
const ELEMENTO_USD = '5532'; // Producer Price (USD/tonne)
const ELEMENTO_LOCAL = '5530'; // Producer Price (LCU/tonne)
const MES_ANUAL = '7021'; // Annual value

/** Separa una línea CSV con comillas dobles (sin saltos de línea dentro de campos). */
export function camposCsv(linea: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (c === ',' && !enComillas) {
      campos.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos;
}

interface Acumulado {
  iso3: string;
  area: string;
  item: string;
  nombreItem: string;
  anio: string;
  usd?: string;
  local?: string;
  bandera?: string;
}

/**
 * Procesa el CSV normalizado de Producer Prices línea por línea. Conserva solo
 * los valores ANUALES de los productos mapeados, por país (ISO3), y une el
 * precio en USD/t con el de moneda local del mismo país, producto y año.
 */
export class ProcesadorFaostat {
  readonly advertencias: string[] = [];
  lineas = 0;

  private pendiente = '';
  private columnas: Map<string, number> | null = null;
  private readonly acumulados = new Map<string, Acumulado>();
  private readonly areasPorIso = new Map<string, string>();
  private readonly anioMinimo: number | null;

  constructor(private readonly filtro: { codigos?: ReadonlySet<string>; desde?: string } = {}) {
    this.anioMinimo = filtro.desde ? Number(filtro.desde.slice(0, 4)) : null;
  }

  escribir(texto: string): void {
    const bloque = this.pendiente + texto;
    const lineas = bloque.split('\n');
    this.pendiente = lineas.pop() ?? '';
    for (const linea of lineas) this.procesarLinea(linea.replace(/\r$/, ''));
  }

  cerrar(): ObservacionPrecioCruda[] {
    if (this.pendiente.trim()) this.procesarLinea(this.pendiente.replace(/\r$/, ''));
    this.pendiente = '';
    if (!this.columnas)
      throw new Error(`El archivo ${ARCHIVO_CSV} está vacío o no tiene encabezado`);

    const observaciones: ObservacionPrecioCruda[] = [];
    for (const a of this.acumulados.values()) {
      if (!a.usd) continue; // sin precio en USD no hay forma de compararlo
      observaciones.push({
        codigoExterno: a.item,
        paisIso3: a.iso3,
        fecha: `${a.anio}-01-01`,
        periodicidad: 'ANUAL',
        presentacion: a.nombreItem,
        valor: a.usd,
        moneda: 'USD',
        unidad: 't',
        metadata: {
          area: a.area,
          valorMonedaLocal: a.local ?? null,
          bandera: a.bandera ?? null,
        },
      });
    }
    return observaciones;
  }

  private columna(campos: string[], nombre: string): string {
    const i = this.columnas!.get(nombre);
    return i === undefined ? '' : (campos[i] ?? '');
  }

  private procesarLinea(linea: string): void {
    if (!linea) return;
    const campos = camposCsv(linea);
    if (!this.columnas) {
      this.columnas = new Map(campos.map((c, i) => [c.trim(), i]));
      for (const requerida of [
        'Area Code (M49)',
        'Area',
        'Item Code',
        'Item',
        'Element Code',
        'Year',
        'Months Code',
        'Value',
      ]) {
        if (!this.columnas.has(requerida))
          throw new Error(`Falta la columna "${requerida}" en el CSV de FAOSTAT`);
      }
      return;
    }
    this.lineas++;

    const item = this.columna(campos, 'Item Code');
    if (this.filtro.codigos && !this.filtro.codigos.has(item)) return;
    if (this.columna(campos, 'Months Code') !== MES_ANUAL) return;
    const elemento = this.columna(campos, 'Element Code');
    if (elemento !== ELEMENTO_USD && elemento !== ELEMENTO_LOCAL) return;
    const anio = this.columna(campos, 'Year');
    if (this.anioMinimo !== null && Number(anio) < this.anioMinimo) return;

    // M49 de país = ISO 3166-1 numérico; los agregados regionales no tienen ISO.
    const m49 = this.columna(campos, 'Area Code (M49)').replace(/^'/, '');
    const iso3 = paises.numericToAlpha3(m49);
    if (!iso3) return;
    const area = this.columna(campos, 'Area');

    // Dos áreas de FAO con el mismo ISO (p. ej. series históricas): gana la primera.
    const areaPrevia = this.areasPorIso.get(`${iso3}|${item}`);
    if (areaPrevia && areaPrevia !== area) {
      const aviso = `Área "${area}" omitida: su ISO ${iso3} ya corresponde a "${areaPrevia}"`;
      if (!this.advertencias.includes(aviso)) this.advertencias.push(aviso);
      return;
    }
    this.areasPorIso.set(`${iso3}|${item}`, area);

    const valor = this.columna(campos, 'Value').trim();
    if (!esDecimal(valor)) return;

    const clave = `${iso3}|${item}|${anio}`;
    const acumulado = this.acumulados.get(clave) ?? {
      iso3,
      area,
      item,
      nombreItem: this.columna(campos, 'Item'),
      anio,
    };
    if (elemento === ELEMENTO_USD) {
      acumulado.usd = aTexto(decimal(valor), 4);
      acumulado.bandera = this.columna(campos, 'Flag') || undefined;
    } else {
      acumulado.local = aTexto(decimal(valor), 4);
    }
    this.acumulados.set(clave, acumulado);
  }
}

/** Precios al productor por país (FAOSTAT, conjunto PP). Alimenta el globo. */
@Injectable()
export class FaostatAdapter implements FuenteAdapter {
  readonly slug = 'faostat';
  /** ~12 MB de descarga y ~214 MB de CSV para recorrer. */
  readonly timeoutMs = 10 * 60_000;

  constructor(private readonly config: ConfigService<VariablesEntorno, true>) {}

  async ejecutar(contexto: ContextoIngesta): Promise<ResultadoAdapter> {
    const respuesta = await fetch(this.config.get('FAOSTAT_URL', { infer: true }), {
      headers: { 'User-Agent': USER_AGENT },
      signal: contexto.signal,
    });
    if (!respuesta.ok || !respuesta.body) {
      throw new Error(`FAOSTAT respondió HTTP ${respuesta.status} ${respuesta.statusText}`);
    }

    const procesador = new ProcesadorFaostat({ codigos: contexto.codigos, desde: contexto.desde });
    const hash = createHash('sha256');
    const decodificador = new TextDecoder('utf-8');
    let encontrado = false;
    let errorZip: Error | null = null;

    const zip = new Unzip();
    zip.register(UnzipInflate);
    zip.onfile = (archivo) => {
      if (archivo.name !== ARCHIVO_CSV) return;
      encontrado = true;
      archivo.ondata = (error, datos, final) => {
        if (error) {
          errorZip = error;
          return;
        }
        procesador.escribir(decodificador.decode(datos, { stream: !final }));
      };
      archivo.start();
    };

    for await (const bloque of respuesta.body) {
      hash.update(bloque);
      zip.push(bloque);
      if (errorZip) throw new Error(`ZIP de FAOSTAT dañado: ${(errorZip as Error).message}`);
    }
    zip.push(new Uint8Array(0), true);
    if (errorZip) throw new Error(`ZIP de FAOSTAT dañado: ${(errorZip as Error).message}`);
    if (!encontrado) throw new Error(`El ZIP de FAOSTAT no contiene ${ARCHIVO_CSV}`);

    const observaciones = procesador.cerrar();
    return {
      observaciones,
      advertencias: procesador.advertencias,
      payloadHash: hash.digest('hex'),
    };
  }
}
