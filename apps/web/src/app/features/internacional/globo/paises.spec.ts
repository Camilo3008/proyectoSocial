import { type DetallePaisDto, type MapaPaisesDto } from '@agroprecios/shared';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeferBlockBehavior, type ComponentFixture, TestBed } from '@angular/core/testing';
import { calcularClases, claseDe } from './escala';
import { claseMapa, RUTA_WORKER, soportaWebgl } from './globo';
import { bandera, Paises } from './paises';

const CITA_FAO =
  'FAO. 2026. FAOSTAT: Precios al productor. Consultado el 16 de noviembre de 2026. https://www.fao.org/faostat/ Licencia: CC-BY-4.0';

// Colombia y Brasil 2024 son valores reales del fixture de FAOSTAT; Etiopía es DATO DE EJEMPLO.
const MAPA: MapaPaisesDto = {
  producto: { slug: 'cafe', nombre: 'Café' },
  fuente: { slug: 'faostat', nombre: 'FAOSTAT', cita: CITA_FAO },
  presentacion: 'verde, precio al productor',
  anio: 2024,
  aniosDisponibles: [2024, 2023, 2022],
  items: [
    {
      iso3: 'COL',
      iso2: 'CO',
      nombre: 'Colombia',
      valorUsdKg: '3.7191',
      valorUsdT: '3719.1000',
      valorMonedaLocalT: '15190000',
      valorCopKg: '15190.0000',
      bandera: 'A',
    },
    {
      iso3: 'ETH',
      iso2: 'ET',
      nombre: 'Etiopía',
      valorUsdKg: '2.1000', // DATO DE EJEMPLO
      valorUsdT: '2100.0000', // DATO DE EJEMPLO
      valorMonedaLocalT: null,
      valorCopKg: null,
      bandera: 'E',
    },
  ],
};

// DATO DE EJEMPLO: forma real de la API.
const BRASIL: DetallePaisDto = {
  pais: { iso3: 'BRA', iso2: 'BR', nombre: 'Brasil', region: 'Americas' },
  producto: { slug: 'cafe', nombre: 'Café' },
  fuente: { slug: 'faostat', nombre: 'FAOSTAT', cita: CITA_FAO },
  presentacion: 'verde, precio al productor',
  serie: [
    { anio: 2023, valorUsdKg: '2.5000', valorCopKg: null },
    { anio: 2024, valorUsdKg: '3.0000', valorCopKg: '12000.0000' },
  ],
  ultimo: {
    iso3: 'BRA',
    iso2: 'BR',
    nombre: 'Brasil',
    valorUsdKg: '3.0000',
    valorUsdT: '3000.0000',
    valorMonedaLocalT: '16000',
    valorCopKg: '12000.0000',
    bandera: 'A',
    anio: 2024,
  },
  comparacionColombia: { anio: 2024, valorColombiaUsdKg: '3.7191', diferenciaPct: '-19.34' },
};

describe('escala y utilidades del globo', () => {
  it('reparte los valores en 5 clases por quintiles', () => {
    const limites = calcularClases([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(limites).toEqual([3, 5, 7, 9]);
    expect(claseDe(1, limites)).toBe(0);
    expect(claseDe(5, limites)).toBe(2);
    expect(claseDe(10, limites)).toBe(4);
    expect(calcularClases([])).toEqual([]);
  });

  it('convierte ISO2 en emoji de bandera', () => {
    expect(bandera('CO')).toBe('🇨🇴');
    expect(bandera(null)).toBe('');
    expect(bandera('c0')).toBe('');
  });

  it('obtiene la clase Map de MapLibre (ESM o todo en default) y le indica el worker', () => {
    class MapaFalso {}
    type Modulo = Parameters<typeof claseMapa>[0];
    const setWorkerUrl = vi.fn();
    const url = 'https://agroprecios.example/vendor/maplibre-gl-worker.mjs';

    // MapLibre v6 (ESM): exports con nombre; el worker se sirve desde /vendor.
    expect(claseMapa({ Map: MapaFalso, setWorkerUrl } as unknown as Modulo, url)).toBe(MapaFalso);
    expect(setWorkerUrl).toHaveBeenCalledWith(url);
    // Forma UMD/CommonJS en el build de esbuild: todo en `default` (regresión real con v5).
    expect(claseMapa({ default: { Map: MapaFalso } } as unknown as Modulo)).toBe(MapaFalso);
    expect(() => claseMapa({} as Modulo)).toThrow('MapLibre no expone la clase Map');
    expect(RUTA_WORKER).toBe('vendor/maplibre-gl-worker.mjs');
  });

  it('detecta la falta de WebGL', () => {
    const documento = {
      createElement: () => ({ getContext: () => null }),
    } as unknown as Document;
    expect(soportaWebgl(documento)).toBe(false);
  });
});

describe('Paises', () => {
  let fixture: ComponentFixture<Paises>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Paises],
      providers: [provideHttpClient(), provideHttpClientTesting()],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();
    fixture = TestBed.createComponent(Paises);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const responderMapa = async (mapa = MAPA) => {
    http.expectOne((r) => r.url.startsWith('/api/internacional/paises?')).flush(mapa);
    await fixture.whenStable();
  };

  it('pide el café del último año por defecto y, con año, lo envía', async () => {
    const peticion = http.expectOne((r) => r.url.startsWith('/api/internacional/paises?'));
    expect(peticion.request.url).toBe('/api/internacional/paises?producto=cafe');
    peticion.flush(MAPA);
    await fixture.whenStable();

    fixture.componentRef.setInput('producto', 'cacao');
    fixture.componentRef.setInput('anio', '2022');
    TestBed.tick();
    http
      .expectOne('/api/internacional/paises?producto=cacao&anio=2022')
      .flush({ ...MAPA, items: [] });
    await fixture.whenStable();
    expect(texto()).toContain('Todavía no hay precios por país para este producto.');
  });

  it('en modo globo muestra el marcador del globo diferido, la leyenda y la cita', async () => {
    await responderMapa();
    expect(el().querySelector('.globo-espera')).not.toBeNull();
    const leyenda = Array.from(el().querySelectorAll('.leyenda li')).map((li) =>
      (li.textContent ?? '').trim(),
    );
    expect(leyenda).toHaveLength(6);
    expect(leyenda.at(-1)).toBe('Sin datos');
    expect(texto()).toContain(CITA_FAO);
    expect(texto()).toContain('Mapa hecho con Natural Earth (dominio público).');
    expect(el().querySelector('table')).toBeNull();
  });

  it('en modo tabla lista los países con su bandera y precio, y Colombia resaltada', async () => {
    fixture.componentRef.setInput('vista', 'tabla');
    await responderMapa();
    const filas = Array.from(el().querySelectorAll('tbody tr')).map((tr) =>
      (tr.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(filas).toEqual(['🇨🇴 Colombia US$ 3,72', '🇪🇹 Etiopía US$ 2,10']);
    expect(el().querySelector('.fila--colombia')?.textContent).toContain('Colombia');
    expect(el().querySelector('caption')?.textContent).toContain('Café por país en 2024');
  });

  it('al tocar un país emite el cambio para la URL', async () => {
    fixture.componentRef.setInput('vista', 'tabla');
    await responderMapa();
    const emitidos: Record<string, string | null>[] = [];
    fixture.componentInstance.cambio.subscribe((c) => emitidos.push(c));
    el().querySelector<HTMLButtonElement>('.enlace-pais')!.click();
    expect(emitidos).toEqual([{ pais: 'COL' }]);
  });

  it('muestra la ficha del país con la comparación con Colombia', async () => {
    fixture.componentRef.setInput('pais', 'BRA');
    TestBed.tick();
    http.expectOne('/api/internacional/paises/BRA?producto=cafe').flush(BRASIL);
    await responderMapa();

    const ficha = (el().querySelector('.ficha')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(ficha).toContain('🇧🇷 Brasil');
    expect(ficha).toContain('US$ 3,00 por kilo');
    expect(ficha).toMatch(/≈ \$ 12\.000 por kilo/);
    expect(ficha).toContain('19,34 % menos que en Colombia (US$ 3,72) en 2024');
    expect(ficha).toContain('En moneda local: 16.000 por tonelada.');
    expect(ficha).toContain('Fuente: FAOSTAT · 2024');
    expect(el().querySelectorAll('.barras li')).toHaveLength(2);
  });

  it('si el globo avisa que no hay WebGL, cambia a la tabla y lo explica', async () => {
    await responderMapa();
    (fixture.componentInstance as unknown as { sinWebgl: { set(v: boolean): void } }).sinWebgl.set(
      true,
    );
    await fixture.whenStable();
    expect(texto()).toContain('Este equipo no puede mostrar el globo');
    expect(el().querySelector('table')).not.toBeNull();
    expect(texto()).not.toContain('Ver globo');
  });
});
