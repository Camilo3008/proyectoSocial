import { type ComparativoDto } from '@agroprecios/shared';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NacionalPage } from './nacional.page';

const CITA = 'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co';

// DATO DE EJEMPLO: forma real de la API, valores solo para pruebas.
const COMPARATIVO: ComparativoDto = {
  producto: { slug: 'platano', nombre: 'Plátano' },
  presentacion: 'hartón verde',
  unidad: 'kg',
  moneda: 'COP',
  fecha: '2026-11-13',
  fuente: { slug: 'sipsa', nombre: 'DANE – SIPSA (precios mayoristas)', cita: CITA },
  referencia: { mercadoId: 7, nombre: 'Neiva, Surabastos', valor: '2133.0000' },
  items: [
    {
      mercado: { id: 3, nombre: 'Bogotá, D.C., Corabastos', departamento: 'BOGOTÁ, D.C.' },
      valor: '3250.0000',
      diferenciaPct: '52.37',
      esReferencia: false,
    },
    {
      mercado: { id: 7, nombre: 'Neiva, Surabastos', departamento: 'HUILA' },
      valor: '2133.0000',
      diferenciaPct: '0.00',
      esReferencia: true,
    },
    {
      mercado: {
        id: 9,
        nombre: 'Popayán, Plaza de mercado del barrio Bolívar',
        departamento: 'CAUCA',
      },
      valor: '2000.0000',
      diferenciaPct: '-6.24',
      esReferencia: false,
    },
  ],
};

describe('NacionalPage', () => {
  let fixture: ComponentFixture<NacionalPage>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NacionalPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(NacionalPage);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('producto', 'platano');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista los mercados de mayor a menor y los compara con Neiva', async () => {
    http.expectOne('/api/precios/series?producto=platano').flush([]);
    http.expectOne('/api/precios/comparativo?producto=platano').flush(COMPARATIVO);
    await fixture.whenStable();

    // Texto de cada fila uniendo sus partes (textContent no separa los <span>).
    const filas = Array.from(el().querySelectorAll('li.fila')).map((li) =>
      Array.from(li.querySelectorAll('span'))
        .map((s) => (s.textContent ?? '').replace(/\s+/g, ' ').trim())
        .join(' '),
    );
    expect(filas).toEqual([
      'Bogotá, D.C., Corabastos BOGOTÁ, D.C. $ 3.250 52,37 % más que Neiva, Surabastos',
      'Neiva, Surabastos HUILA Referencia de la región $ 2.133',
      'Popayán, Plaza de mercado del barrio Bolívar CAUCA $ 2.000 6,24 % menos que Neiva, Surabastos',
    ]);
    expect(el().querySelector('.fila--referencia')?.textContent).toContain('Neiva');
    const texto = (el().textContent ?? '').replace(/\s+/g, ' ');
    expect(texto).toContain('Plátano hartón verde');
    expect(texto).toContain('13 nov 2026 · precios por kilo');
    expect(texto).toContain(CITA);
  });

  it('pasa la presentación y la fecha de la URL a la API', async () => {
    fixture.componentRef.setInput('presentacion', 'guineo');
    fixture.componentRef.setInput('fecha', '2026-11-10');
    TestBed.tick();
    http.expectOne('/api/precios/series?producto=platano').flush([]);
    // La petición inicial (solo producto) queda cancelada al cambiar los filtros de la URL.
    const peticion = http
      .match((r) => r.url.startsWith('/api/precios/comparativo?'))
      .filter((p) => !p.cancelled)
      .at(-1)!;
    expect(peticion.request.urlWithParams).toBe(
      '/api/precios/comparativo?producto=platano&presentacion=guineo&fecha=2026-11-10',
    );
    peticion.flush({ ...COMPARATIVO, items: [], fecha: null, referencia: null });
    await fixture.whenStable();
    expect(el().textContent).toContain('No hay datos de mercados para esa fecha');
  });
});
