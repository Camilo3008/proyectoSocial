import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { construirUrlTrm, parsearTrm, TrmAdapter } from './trm.adapter.js';

// Fixture REAL descargado de datos.gov.co el 2026-11-16 (ver test/fixtures/README.md).
const FIXTURE = readFileSync(
  join(import.meta.dirname, '../../../test/fixtures/trm/ultimas-40.json'),
  'utf8',
);

describe('TrmAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('parsearTrm (fixture real)', () => {
    const { tasas, advertencias } = parsearTrm(FIXTURE);
    const porFecha = Object.fromEntries(tasas.map((t) => [t.fecha, t.valor]));

    it('no genera advertencias con datos válidos', () => {
      expect(advertencias).toEqual([]);
    });

    it('expande los rangos de vigencia a una tasa por día', () => {
      // 3316.7 rige del sábado 14 al martes 17 de noviembre (incluye el festivo del 16).
      expect(porFecha['2026-11-14']).toBe('3316.7');
      expect(porFecha['2026-11-15']).toBe('3316.7');
      expect(porFecha['2026-11-16']).toBe('3316.7');
      expect(porFecha['2026-11-17']).toBe('3316.7');
      expect(porFecha['2026-11-13']).toBe('3301.91');
      expect(porFecha['2026-11-11']).toBe('3297.07');
      expect(porFecha['2026-11-12']).toBe('3297.07');
    });

    it('produce días consecutivos, ordenados y en USD→COP', () => {
      const fechas = tasas.map((t) => t.fecha);
      expect(fechas[0]).toBe('2026-09-17');
      expect(fechas.at(-1)).toBe('2026-11-17');
      expect(new Set(fechas).size).toBe(fechas.length);
      expect([...fechas].sort()).toEqual(fechas);
      expect(tasas.every((t) => t.monedaOrigen === 'USD' && t.monedaDestino === 'COP')).toBe(true);
      // 2026-09-17 .. 2026-11-17 = 62 días sin huecos
      expect(tasas).toHaveLength(62);
    });
  });

  describe('parsearTrm (casos de error)', () => {
    it('descarta filas con unidad distinta o formato inválido', () => {
      const { tasas, advertencias } = parsearTrm(
        JSON.stringify([
          {
            valor: '4000',
            unidad: 'USD',
            vigenciadesde: '2026-01-02T00:00:00.000',
            vigenciahasta: '2026-01-02T00:00:00.000',
          },
          {
            valor: '4.000,5',
            unidad: 'COP',
            vigenciadesde: '2026-01-03T00:00:00.000',
            vigenciahasta: '2026-01-03T00:00:00.000',
          },
          {
            valor: '4001.5',
            unidad: 'COP',
            vigenciadesde: '2026-01-05T00:00:00.000',
            vigenciahasta: '2026-01-04T00:00:00.000',
          },
          {
            valor: '4002.25',
            unidad: 'COP',
            vigenciadesde: '2026-01-06T00:00:00.000',
            vigenciahasta: '2026-01-06T00:00:00.000',
          },
        ]),
      );
      expect(tasas).toEqual([
        { fecha: '2026-01-06', monedaOrigen: 'USD', monedaDestino: 'COP', valor: '4002.25' },
      ]);
      expect(advertencias).toHaveLength(3);
    });

    it('falla si la respuesta no es un arreglo', () => {
      expect(() => parsearTrm('{"error":"x"}')).toThrow(/arreglo/);
      expect(() => parsearTrm('<html>')).toThrow();
    });
  });

  describe('construirUrlTrm', () => {
    it('pide las últimas filas por defecto', () => {
      const url = new URL(construirUrlTrm());
      expect(url.origin + url.pathname).toBe('https://www.datos.gov.co/resource/32sa-8pi3.json');
      expect(url.searchParams.get('$order')).toBe('vigenciadesde DESC');
      expect(url.searchParams.get('$limit')).toBe('40');
    });

    it('filtra desde una fecha validada', () => {
      const url = new URL(construirUrlTrm({ desde: '2026-01-01' }));
      expect(url.searchParams.get('$where')).toBe("vigenciadesde >= '2026-01-01T00:00:00'");
      expect(() => construirUrlTrm({ desde: "2026-01-01' OR 1=1" })).toThrow(/inválida/);
    });
  });

  it('hace UNA sola descarga con User-Agent identificable y calcula el hash', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(FIXTURE, { status: 200 }));
    vi.stubGlobal('fetch', fetchFalso);

    const resultado = await new TrmAdapter().ejecutar({});

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^AgroPrecios\//);
    expect(resultado.observaciones).toEqual([]);
    expect(resultado.tasas).toHaveLength(62);
    expect(resultado.payloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('propaga un error HTTP de la fuente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 503 })));
    await expect(new TrmAdapter().ejecutar({})).rejects.toThrow(/HTTP 503/);
  });
});
