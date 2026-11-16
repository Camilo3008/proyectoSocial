import { type PreciosHoyDto } from '@agroprecios/shared';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HoyPage } from './hoy.page';

// DATO DE EJEMPLO: valores con la forma de los reales, solo para pruebas.
const RESPUESTA: PreciosHoyDto = {
  generadoEn: '2026-11-16T12:30:00.000Z',
  hoy: '2026-11-16',
  items: [
    {
      producto: { slug: 'cafe', nombre: 'Café' },
      fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros', cita: null },
      mercado: null,
      fecha: '2026-11-13',
      presentacion: 'pergamino seco',
      periodicidad: 'DIARIA',
      valor: '2075000.0000',
      moneda: 'COP',
      unidad: 'carga 125 kg',
      valorCopKg: '16600.0000',
      variacion: null,
      complementos: [],
    },
  ],
  sinDatos: [
    { slug: 'platano', nombre: 'Plátano' },
    { slug: 'cacao', nombre: 'Cacao' },
  ],
  trm: {
    fecha: '2026-11-16',
    valor: '3316.700000',
    fuente: {
      slug: 'trm',
      nombre: 'TRM – Superintendencia Financiera (datos.gov.co)',
      licencia: 'CC BY-SA 4.0 – Superintendencia Financiera de Colombia',
    },
  },
};

describe('HoyPage', () => {
  let fixture: ComponentFixture<HoyPage>;
  let http: HttpTestingController;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const texto = () => (elemento().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await TestBed.configureTestingModule({
      imports: [HoyPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HoyPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('muestra la tarjeta del café, la TRM con su licencia y los productos pendientes', async () => {
    http.expectOne('/api/precios/hoy').flush(RESPUESTA);
    await fixture.whenStable();

    expect(texto()).toContain('Lunes, 16 de noviembre'.slice(1)); // la mayúscula la pone CSS
    expect(elemento().querySelectorAll('ap-tarjeta-precio').length).toBe(1);
    expect(texto()).toContain('Dólar hoy (TRM): $ 3.316,70 · 16 nov 2026');
    expect(texto()).toContain('CC BY-SA 4.0');
    expect(texto()).toContain('Próximamente: Plátano, Cacao.');
    expect(texto()).not.toContain('Sin conexión');
  });

  it('avisa la antigüedad de los datos cuando no hay conexión', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    http.expectOne('/api/precios/hoy').flush(RESPUESTA);
    await fixture.whenStable();

    expect(texto()).toMatch(/Sin conexión · datos actualizados el 16 nov, 7:30/);
    window.dispatchEvent(new Event('online'));
  });

  it('ofrece reintentar si la API falla', async () => {
    http.expectOne('/api/precios/hoy').flush('error', { status: 503, statusText: 'No disponible' });
    await fixture.whenStable();
    expect(texto()).toContain('No pudimos cargar los precios');

    (elemento().querySelector('button') as HTMLButtonElement).click();
    TestBed.tick();
    http.expectOne('/api/precios/hoy').flush(RESPUESTA);
    await fixture.whenStable();
    expect(elemento().querySelectorAll('ap-tarjeta-precio').length).toBe(1);
  });
});
