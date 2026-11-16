import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SaxesParser } from 'saxes';
import { esDecimal } from '../../common/decimal.js';
import {
  type ContextoIngesta,
  type FuenteAdapter,
  type ObservacionPrecioCruda,
  type ResultadoAdapter,
} from './fuente-adapter.interface.js';
import { USER_AGENT } from './http.js';

/** Servicio SOAP 1.2 verificado (docs/fuentes/sipsa.md). */
export const URL_SIPSA = 'https://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService';
const NS_SIPSA = 'http://servicios.sipsa.co.gov.dane/';

/** Operación usada: precio diario por central mayorista, TODO el histórico (~316 MB). */
export const SOBRE_PROMEDIOS_PARCIAL =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" ' +
  `xmlns:ser="${NS_SIPSA}"><soap:Body><ser:promediosSipsaParcial/></soap:Body></soap:Envelope>`;

const CAMPOS = [
  'artiNombre',
  'deptNombre',
  'enmaFecha',
  'fuenId',
  'fuenNombre',
  'grupNombre',
  'idArtiSemana',
  'maximoKg',
  'minimoKg',
  'muniId',
  'muniNombre',
  'promedioKg',
] as const;
type Campo = (typeof CAMPOS)[number];
type RegistroSipsa = Partial<Record<Campo, string>>;

const ES_CAMPO = new Set<string>(CAMPOS);
const PATRON_FECHA = /^(\d{4}-\d{2}-\d{2})T/;

export interface FiltroSipsa {
  /** Solo estos códigos de artículo (idArtiSemana). Sin filtro: todos. */
  codigos?: ReadonlySet<string>;
  /** Solo datos con fecha >= desde (YYYY-MM-DD). */
  desde?: string;
}

/**
 * Procesa la respuesta SOAP de promediosSipsaParcial en streaming: nunca tiene
 * el documento completo en memoria, solo el registro <return> actual. Descarta
 * temprano lo que no está mapeado o es anterior a `desde`.
 */
export class ProcesadorSipsa {
  readonly observaciones: ObservacionPrecioCruda[] = [];
  readonly advertencias: string[] = [];
  /** Registros <return> recibidos (antes de filtrar). */
  registros = 0;

  private readonly parser = new SaxesParser({ xmlns: true });
  private actual: RegistroSipsa | null = null;
  private campo: Campo | null = null;
  private texto = '';
  private falla: string | null = null;
  private dentroDeFalla = false;

  constructor(private readonly filtro: FiltroSipsa = {}) {
    this.parser.on('opentag', (nodo) => {
      if (nodo.local === 'Fault') this.dentroDeFalla = true;
      if (nodo.local === 'return') {
        this.actual = {};
      } else if (this.actual && ES_CAMPO.has(nodo.local)) {
        this.campo = nodo.local as Campo;
        this.texto = '';
      }
    });
    this.parser.on('text', (texto) => {
      if (this.campo) this.texto += texto;
      else if (this.dentroDeFalla && texto.trim()) this.falla = (this.falla ?? '') + texto.trim();
    });
    this.parser.on('closetag', (nodo) => {
      if (this.actual && this.campo && nodo.local === this.campo) {
        this.actual[this.campo] = this.texto.trim();
        this.campo = null;
      } else if (nodo.local === 'return' && this.actual) {
        this.registros++;
        this.procesar(this.actual);
        this.actual = null;
      }
    });
  }

  escribir(fragmento: string): void {
    this.parser.write(fragmento);
  }

  cerrar(): void {
    this.parser.close();
    if (this.falla) {
      throw new Error(`SIPSA respondió un error SOAP: ${this.falla}`);
    }
  }

  private procesar(r: RegistroSipsa): void {
    const codigo = r.idArtiSemana ?? '';
    if (this.filtro.codigos && !this.filtro.codigos.has(codigo)) return;

    const fecha = PATRON_FECHA.exec(r.enmaFecha ?? '')?.[1];
    if (fecha && this.filtro.desde && fecha < this.filtro.desde) return;

    const valor = r.promedioKg ?? '';
    if (!fecha || !esDecimal(valor) || !r.fuenId || !r.fuenNombre) {
      this.advertencias.push(`Registro SIPSA inválido descartado: ${JSON.stringify(r)}`);
      return;
    }

    this.observaciones.push({
      codigoExterno: codigo,
      mercado: {
        codigoExterno: r.fuenId,
        nombre: r.fuenNombre,
        tipo: 'MAYORISTA',
        municipio: r.muniNombre || undefined,
        departamento: r.deptNombre || undefined,
      },
      fecha,
      periodicidad: 'DIARIA',
      // Presentación ORIGINAL de la fuente; el IngestaService aplica la del mapeo.
      presentacion: r.artiNombre ?? '',
      valor,
      moneda: 'COP',
      unidad: 'kg',
      metadata: {
        nombreSipsa: r.artiNombre ?? null,
        grupo: r.grupNombre ?? null,
        minimoKg: r.minimoKg ?? null,
        maximoKg: r.maximoKg ?? null,
        muniId: r.muniId ?? null,
      },
    });
  }
}

/** Precios mayoristas diarios del DANE (SIPSA) por central de abastos. */
@Injectable()
export class SipsaAdapter implements FuenteAdapter {
  readonly slug = 'sipsa';
  /** La respuesta completa tarda ~95 s (medido el 2026-11-16). */
  readonly timeoutMs = 10 * 60_000;

  async ejecutar(contexto: ContextoIngesta): Promise<ResultadoAdapter> {
    const respuesta = await fetch(URL_SIPSA, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/soap+xml; charset=utf-8',
        Accept: 'application/soap+xml',
      },
      body: SOBRE_PROMEDIOS_PARCIAL,
      signal: contexto.signal,
    });
    // Un SOAP Fault llega con HTTP 500: se procesa el cuerpo para mostrar el mensaje.
    if (!respuesta.ok && respuesta.status !== 500) {
      throw new Error(`SIPSA respondió HTTP ${respuesta.status} ${respuesta.statusText}`);
    }
    if (!respuesta.body) {
      throw new Error('SIPSA respondió sin cuerpo');
    }

    const procesador = new ProcesadorSipsa({ codigos: contexto.codigos, desde: contexto.desde });
    const hash = createHash('sha256');
    const decodificador = new TextDecoder('utf-8');
    for await (const bloque of respuesta.body) {
      hash.update(bloque);
      procesador.escribir(decodificador.decode(bloque, { stream: true }));
    }
    procesador.escribir(decodificador.decode());
    procesador.cerrar();

    if (!respuesta.ok) {
      throw new Error(`SIPSA respondió HTTP ${respuesta.status}`);
    }
    if (procesador.registros === 0) {
      throw new Error('SIPSA no devolvió registros');
    }

    return {
      observaciones: procesador.observaciones,
      advertencias: procesador.advertencias,
      payloadHash: hash.digest('hex'),
    };
  }
}
