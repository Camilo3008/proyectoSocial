import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ConfigService } from '@nestjs/config';
import { type VariablesEntorno } from '../../config/variables-entorno.js';
import {
  buscarEnlaceEnPagina,
  PAGINA_WORLDBANK,
  procesarLibroWorldBank,
  WorldBankAdapter,
} from './worldbank.adapter.js';
import { leerHojaXlsx } from './xlsx.js';

// Archivo REAL del Banco Mundial actualizado el 2026-11-03 (ver test/fixtures/README.md).
const FIXTURE = new Uint8Array(
  readFileSync(
    join(
      import.meta.dirname,
      '../../../test/fixtures/worldbank/CMO-Historical-Data-Monthly-2026-11-03.xlsx',
    ),
  ),
);
const CODIGOS = new Set([
  'Coffee, Arabica',
  'Coffee, Robusta',
  'Cocoa',
  'Banana, US',
  'Banana, Europe',
]);
const URL_CONFIGURADA =
  'https://thedocs.worldbank.org/en/doc/abc/related/CMO-Historical-Data-Monthly.xlsx';

const configFalsa = {
  get: (clave: string) => (clave === 'WORLDBANK_URL' ? URL_CONFIGURADA : undefined),
} as unknown as ConfigService<VariablesEntorno, true>;

describe('WorldBankAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('lector XLSX + procesarLibroWorldBank (archivo real)', () => {
    const filas = leerHojaXlsx(FIXTURE, 'Monthly Prices');
    const { observaciones, advertencias, actualizado } = procesarLibroWorldBank(filas, {
      codigos: CODIGOS,
    });
    const valor = (codigo: string, fecha: string) =>
      observaciones.find((o) => o.codigoExterno === codigo && o.fecha === fecha)?.valor;

    it('lee la hoja y la fecha de actualización', () => {
      expect(advertencias).toEqual([]);
      expect(actualizado).toBe('Updated on November 03, 2026');
    });

    it('extrae los últimos valores (octubre de 2026) normalizados a 4 decimales', () => {
      expect(valor('Cocoa', '2026-10-01')).toBe('5.7500');
      expect(valor('Coffee, Arabica', '2026-10-01')).toBe('7.4000');
      expect(valor('Coffee, Robusta', '2026-10-01')).toBe('3.6300');
      // En el archivo: 1.1000000000000001
      expect(valor('Banana, Europe', '2026-10-01')).toBe('1.1000');
      expect(valor('Banana, US', '2026-10-01')).toBe('1.1800');
    });

    it('incluye la historia desde 1960 como serie mensual en USD/kg', () => {
      expect(valor('Coffee, Arabica', '1960-01-01')).toBe('0.9400');
      expect(observaciones.every((o) => o.periodicidad === 'MENSUAL')).toBe(true);
      expect(observaciones.every((o) => o.moneda === 'USD' && o.unidad === 'kg')).toBe(true);
      expect(observaciones.every((o) => o.fecha.endsWith('-01'))).toBe(true);
    });

    it('omite los valores faltantes ("…") sin generar advertencias', () => {
      // El banano de Europa no tiene datos en 1960.
      expect(valor('Banana, Europe', '1960-01-01')).toBeUndefined();
    });

    it('filtra por fecha mínima', () => {
      const desde2026 = procesarLibroWorldBank(filas, { codigos: CODIGOS, desde: '2026-01-01' });
      // enero a octubre de 2026 × 5 series
      expect(desde2026.observaciones).toHaveLength(50);
    });

    it('advierte si una serie mapeada no está en el archivo', () => {
      const r = procesarLibroWorldBank(filas, { codigos: new Set(['Coffee, Arabica', 'Pitaya']) });
      expect(r.advertencias).toEqual(['La serie "Pitaya" no está en el archivo']);
    });

    it('rechaza una hoja sin los encabezados esperados', () => {
      expect(() => procesarLibroWorldBank([])).toThrow(/encabezados/);
    });
  });

  it('rechaza un archivo que no es XLSX', () => {
    expect(() => leerHojaXlsx(new TextEncoder().encode('<html>'), 'Monthly Prices')).toThrow(
      /XLSX/,
    );
  });

  it('encuentra el enlace vigente en la página oficial', () => {
    const html =
      '<a href="https://thedocs.worldbank.org/en/doc/xyz-0050012027/related/CMO-Historical-Data-Monthly.xlsx">Monthly</a>' +
      '<a href="https://thedocs.worldbank.org/en/doc/xyz/related/CMO-Historical-Data-Annual.xlsx">Annual</a>';
    expect(buscarEnlaceEnPagina(html)).toBe(
      'https://thedocs.worldbank.org/en/doc/xyz-0050012027/related/CMO-Historical-Data-Monthly.xlsx',
    );
    expect(buscarEnlaceEnPagina('<html></html>')).toBeNull();
  });

  it('descarga UNA vez la URL configurada con User-Agent identificable', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(FIXTURE));
    vi.stubGlobal('fetch', fetchFalso);

    const r = await new WorldBankAdapter(configFalsa).ejecutar({
      codigos: CODIGOS,
      desde: '2026-10-01',
    });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL_CONFIGURADA);
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^AgroPrecios\//);
    expect(r.observaciones).toHaveLength(5);
    expect(r.advertencias).toEqual([]);
    expect(r.payloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('si la URL ya no existe, busca el enlace vigente en la página oficial y lo advierte', async () => {
    const nueva =
      'https://thedocs.worldbank.org/en/doc/nuevo/related/CMO-Historical-Data-Monthly.xlsx';
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(new Response('no', { status: 404 }))
      .mockResolvedValueOnce(new Response(`<a href="${nueva}">x</a>`))
      .mockResolvedValueOnce(new Response(FIXTURE));
    vi.stubGlobal('fetch', fetchFalso);

    const r = await new WorldBankAdapter(configFalsa).ejecutar({
      codigos: CODIGOS,
      desde: '2026-10-01',
    });

    expect(fetchFalso.mock.calls.map((c) => c[0] as string)).toEqual([
      URL_CONFIGURADA,
      PAGINA_WORLDBANK,
      nueva,
    ]);
    expect(r.observaciones).toHaveLength(5);
    expect(r.advertencias[0]).toMatch(/WORLDBANK_URL ya no existe/);
  });

  it('falla con un mensaje claro ante otros errores HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 503 })));
    await expect(new WorldBankAdapter(configFalsa).ejecutar({})).rejects.toThrow(/HTTP 503/);
  });
});
