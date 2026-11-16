import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ProcesadorSipsa,
  SipsaAdapter,
  SOBRE_PROMEDIOS_PARCIAL,
  URL_SIPSA,
} from './sipsa.adapter.js';

// Recorte REAL de promediosSipsaParcial del 2026-11-16 (ver test/fixtures/README.md).
const FIXTURE = readFileSync(
  join(import.meta.dirname, '../../../test/fixtures/sipsa/promedios-parcial-recorte.xml'),
  'utf8',
);
const CODIGOS = new Set(['15', '34', '35']);

/** Simula una respuesta HTTP que llega en varios fragmentos. */
function respuestaEnFragmentos(texto: string, tamano = 997, status = 200): Response {
  const bytes = new TextEncoder().encode(texto);
  const cuerpo = new ReadableStream<Uint8Array>({
    start(control) {
      for (let i = 0; i < bytes.length; i += tamano) control.enqueue(bytes.slice(i, i + tamano));
      control.close();
    },
  });
  return new Response(cuerpo, { status });
}

describe('SipsaAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('ProcesadorSipsa (fixture real)', () => {
    const procesar = (filtro = {}) => {
      const p = new ProcesadorSipsa(filtro);
      p.escribir(FIXTURE);
      p.cerrar();
      return p;
    };

    it('lee todos los registros y conserva solo los códigos mapeados', () => {
      const p = procesar({ codigos: CODIGOS });
      expect(p.registros).toBe(26);
      expect(p.advertencias).toEqual([]);
      expect(new Set(p.observaciones.map((o) => o.codigoExterno))).toEqual(CODIGOS);
      // 26 registros = 24 de interés (Neiva y Bogotá) + 2 de otros productos (ignorados)
      expect(p.observaciones).toHaveLength(24);
    });

    it('mapea el plátano hartón verde de Neiva con su mercado tal como viene de la fuente', () => {
      const p = procesar({ codigos: CODIGOS });
      const neiva = p.observaciones.find(
        (o) =>
          o.codigoExterno === '35' && o.mercado?.codigoExterno === '22' && o.fecha === '2026-11-13',
      );
      expect(neiva).toEqual({
        codigoExterno: '35',
        mercado: {
          codigoExterno: '22',
          nombre: 'Neiva, Surabastos',
          tipo: 'MAYORISTA',
          municipio: 'NEIVA',
          departamento: 'HUILA',
        },
        fecha: '2026-11-13',
        periodicidad: 'DIARIA',
        presentacion: 'Plátano hartón verde',
        valor: '2133',
        moneda: 'COP',
        unidad: 'kg',
        metadata: {
          nombreSipsa: 'Plátano hartón verde',
          grupo: 'TUBERCULOS, RAICES Y PLATANOS',
          minimoKg: '2000',
          maximoKg: '2200',
          muniId: '41001',
        },
      });
    });

    it('filtra por fecha mínima', () => {
      const p = procesar({ codigos: CODIGOS, desde: '2026-11-13' });
      expect(p.observaciones.length).toBeGreaterThan(0);
      expect(p.observaciones.every((o) => o.fecha === '2026-11-13')).toBe(true);
    });

    it('sin filtro de códigos conserva todos los registros válidos', () => {
      expect(procesar().observaciones).toHaveLength(26);
    });

    it('produce el mismo resultado aunque el XML llegue partido en fragmentos', () => {
      const p = new ProcesadorSipsa({ codigos: CODIGOS });
      for (let i = 0; i < FIXTURE.length; i += 37) p.escribir(FIXTURE.slice(i, i + 37));
      p.cerrar();
      expect(p.observaciones).toEqual(procesar({ codigos: CODIGOS }).observaciones);
    });

    it('descarta registros con valor inválido y lo reporta', () => {
      const malo = FIXTURE.replace('<promedioKg>2133</promedioKg>', '<promedioKg>N/D</promedioKg>');
      const p = new ProcesadorSipsa({ codigos: CODIGOS });
      p.escribir(malo);
      p.cerrar();
      expect(p.advertencias).toHaveLength(1);
      expect(p.observaciones).toHaveLength(23);
    });

    it('convierte un SOAP Fault en error', () => {
      const falla =
        '<?xml version="1.0"?><S:Envelope xmlns:S="http://www.w3.org/2003/05/soap-envelope"><S:Body>' +
        '<S:Fault><S:Code><S:Value>S:Receiver</S:Value></S:Code><S:Reason><S:Text xml:lang="en">Error interno</S:Text></S:Reason></S:Fault>' +
        '</S:Body></S:Envelope>';
      const p = new ProcesadorSipsa();
      p.escribir(falla);
      expect(() => p.cerrar()).toThrow(/error SOAP.*Error interno/);
    });

    it('rechaza XML mal formado', () => {
      const p = new ProcesadorSipsa();
      expect(() => {
        p.escribir('<S:Envelope><return><artiNombre>x</return>');
        p.cerrar();
      }).toThrow();
    });
  });

  it('hace UNA sola petición SOAP 1.2 con User-Agent identificable y procesa en streaming', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(respuestaEnFragmentos(FIXTURE));
    vi.stubGlobal('fetch', fetchFalso);

    const resultado = await new SipsaAdapter().ejecutar({ codigos: CODIGOS });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe(URL_SIPSA);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(SOBRE_PROMEDIOS_PARCIAL);
    expect(headers['Content-Type']).toBe('application/soap+xml; charset=utf-8');
    expect(headers['User-Agent']).toMatch(/^AgroPrecios\//);
    expect(resultado.observaciones).toHaveLength(24);
    expect(resultado.payloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('falla con un mensaje claro ante HTTP de error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 503 })));
    await expect(new SipsaAdapter().ejecutar({})).rejects.toThrow(/HTTP 503/);
  });
});
