import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ConfigService } from '@nestjs/config';
import { strFromU8, unzipSync } from 'fflate';
import { type VariablesEntorno } from '../../config/variables-entorno.js';
import { ARCHIVO_CSV, camposCsv, FaostatAdapter, ProcesadorFaostat } from './faostat.adapter.js';

// Recorte REAL de FAOSTAT Producer Prices (2026-10-09): ver test/fixtures/README.md.
const ZIP = new Uint8Array(
  readFileSync(
    join(import.meta.dirname, '../../../test/fixtures/faostat/producer-prices-recorte.zip'),
  ),
);
const CSV = strFromU8(unzipSync(ZIP)[ARCHIVO_CSV]!);
const CODIGOS = new Set(['656', '661', '486', '487']);
const URL_CONFIGURADA =
  'https://bulks-faostat.fao.org/production/Prices_E_All_Data_(Normalized).zip';
const configFalsa = {
  get: (clave: string) => (clave === 'FAOSTAT_URL' ? URL_CONFIGURADA : undefined),
} as unknown as ConfigService<VariablesEntorno, true>;

function procesar(texto: string, filtro = { codigos: CODIGOS as ReadonlySet<string> }) {
  const p = new ProcesadorFaostat(filtro);
  p.escribir(texto);
  return { observaciones: p.cerrar(), procesador: p };
}

describe('FaostatAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('separa campos CSV con comillas y comas internas', () => {
    expect(camposCsv('"44","\'170","Côte d\'Ivoire","Coffee, green","3719.1"')).toEqual([
      '44',
      "'170",
      "Côte d'Ivoire",
      'Coffee, green',
      '3719.1',
    ]);
    expect(camposCsv('"a ""b""",c')).toEqual(['a "b"', 'c']);
  });

  describe('ProcesadorFaostat (recorte real)', () => {
    const { observaciones } = procesar(CSV);
    const buscar = (iso3: string, item: string, anio: string) =>
      observaciones.find(
        (o) => o.paisIso3 === iso3 && o.codigoExterno === item && o.fecha === `${anio}-01-01`,
      );

    it('convierte el M49 a ISO3 y guarda el precio anual en USD por tonelada', () => {
      expect(buscar('COL', '656', '2024')).toMatchObject({
        paisIso3: 'COL',
        codigoExterno: '656',
        fecha: '2024-01-01',
        periodicidad: 'ANUAL',
        valor: '3719.1000',
        moneda: 'USD',
        unidad: 't',
        presentacion: 'Coffee, green',
      });
      expect(buscar('COL', '661', '2024')?.valor).toBe('6733.1000');
      expect(buscar('CIV', '661', '2024')).toBeDefined(); // Côte d'Ivoire: M49 384
      expect(buscar('VNM', '656', '2024')).toBeDefined();
    });

    it('une el precio en moneda local del mismo país, producto y año', () => {
      const cafe = buscar('COL', '656', '2024');
      expect(cafe?.metadata).toMatchObject({ area: 'Colombia', bandera: 'A' });
      expect(cafe?.metadata?.['valorMonedaLocal']).toMatch(/^\d+\.\d{4}$/);
    });

    it('ignora productos sin mapeo', () => {
      expect(observaciones.every((o) => CODIGOS.has(o.codigoExterno))).toBe(true);
    });

    it('filtra por año mínimo', () => {
      const { observaciones: desde2024 } = procesar(CSV, {
        codigos: CODIGOS,
        desde: '2024-01-01',
      } as never);
      expect(desde2024.length).toBeGreaterThan(0);
      expect(desde2024.every((o) => o.fecha === '2024-01-01')).toBe(true);
    });
  });

  it('ignora agregados regionales, valores mensuales y filas sin USD (filas sintéticas)', () => {
    const [encabezado] = CSV.split('\n');
    const sinteticas = [
      // Agregado "South America" (M49 005, no es un país)
      '"5207","\'005","South America","656","\'01610","Coffee, green","5532","Producer Price (USD/tonne)","2024","2024","7021","Annual value","USD","3000.000000","A"',
      // Valor mensual (enero), no anual
      '"44","\'170","Colombia","656","\'01610","Coffee, green","5532","Producer Price (USD/tonne)","2024","2024","7001","January","USD","3500.000000","A"',
      // Solo moneda local, sin USD
      '"44","\'170","Colombia","487","\'01313.01","Plantains","5530","Producer Price (LCU/tonne)","2010","2010","7021","Annual value","LCU","900000.000000","A"',
    ];
    const { observaciones } = procesar(`${encabezado}\n${sinteticas.join('\n')}\n`);
    expect(observaciones).toEqual([]);
  });

  it('produce el mismo resultado aunque el texto llegue partido', () => {
    const p = new ProcesadorFaostat({ codigos: CODIGOS });
    for (let i = 0; i < CSV.length; i += 41) p.escribir(CSV.slice(i, i + 41));
    expect(p.cerrar()).toEqual(procesar(CSV).observaciones);
  });

  it('falla si falta una columna requerida', () => {
    expect(() => procesar('"Area","Item"\n"x","y"\n')).toThrow(/Falta la columna/);
  });

  it('descarga UNA vez, descomprime en streaming y calcula el hash', async () => {
    const bytes = ZIP;
    const cuerpo = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < bytes.length; i += 200) c.enqueue(bytes.slice(i, i + 200));
        c.close();
      },
    });
    const fetchFalso = vi.fn().mockResolvedValue(new Response(cuerpo));
    vi.stubGlobal('fetch', fetchFalso);

    const r = await new FaostatAdapter(configFalsa).ejecutar({ codigos: CODIGOS });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL_CONFIGURADA);
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^AgroPrecios\//);
    expect(r.observaciones).toEqual(procesar(CSV).observaciones);
    expect(r.payloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('falla con un mensaje claro si el ZIP no trae el CSV o hay error HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 503 })));
    await expect(new FaostatAdapter(configFalsa).ejecutar({})).rejects.toThrow(/HTTP 503/);

    const { zipSync, strToU8 } = await import('fflate');
    const otro = zipSync({ 'otro.csv': strToU8('a,b\n') });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(otro)));
    await expect(new FaostatAdapter(configFalsa).ejecutar({})).rejects.toThrow(/no contiene/);
  });
});
