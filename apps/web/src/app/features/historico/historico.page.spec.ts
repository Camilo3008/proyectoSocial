import { type SerieDisponibleDto, type SeriePrecioDto } from '@agroprecios/shared';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GraficaLinea, type SerieGrafica } from '../../shared/grafica-linea/grafica-linea';
import { HistoricoPage } from './historico.page';

/** jsdom no tiene <canvas>: la gráfica se reemplaza por un doble de prueba. */
@Component({
  selector: 'ap-grafica-linea',
  template: '<p class="grafica-falsa">{{ etiquetas().length }} puntos</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GraficaFalsa {
  readonly etiquetas = input.required<string[]>();
  readonly series = input.required<SerieGrafica[]>();
  readonly formatear = input<(v: number) => string>();
}

const CITA = 'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co';
const SIPSA = { slug: 'sipsa', nombre: 'DANE – SIPSA (precios mayoristas)', cita: CITA };

// DATO DE EJEMPLO: forma real de la API, valores solo para pruebas.
const SERIES: SerieDisponibleDto[] = [
  {
    fuente: SIPSA,
    mercado: { id: 7, nombre: 'Neiva, Surabastos', departamento: 'HUILA' },
    presentacion: 'hartón verde',
    unidad: 'kg',
    moneda: 'COP',
    desde: '2020-02-01',
    hasta: '2026-11-13',
    cantidad: 1500,
    predeterminada: true,
  },
  {
    fuente: SIPSA,
    mercado: { id: 3, nombre: 'Bogotá, D.C., Corabastos', departamento: 'BOGOTÁ, D.C.' },
    presentacion: 'guineo',
    unidad: 'kg',
    moneda: 'COP',
    desde: '2020-02-01',
    hasta: '2026-11-13',
    cantidad: 1500,
    predeterminada: false,
  },
];

const SERIE: SeriePrecioDto = {
  producto: { slug: 'platano', nombre: 'Plátano' },
  fuente: SIPSA,
  mercado: { id: 7, nombre: 'Neiva, Surabastos' },
  presentacion: 'hartón verde',
  unidad: 'kg',
  moneda: 'COP',
  desde: '2026-10-14',
  hasta: '2026-11-13',
  items: [
    { fecha: '2026-11-12', valor: '1933.0000' },
    { fecha: '2026-11-13', valor: '2133.0000' },
  ],
  resumen: { minimo: '1933.0000', maximo: '2133.0000', promedio: '2033.0000', cantidad: 2 },
};

describe('HistoricoPage', () => {
  let fixture: ComponentFixture<HistoricoPage>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricoPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideComponent(HistoricoPage, {
        remove: { imports: [GraficaLinea] },
        add: { imports: [GraficaFalsa] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(HistoricoPage);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('producto', 'platano');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  /**
   * Deja que los recursos procesen las respuestas (llegan en una tarea posterior)
   * y ejecuta sus efectos, sin esperar las peticiones HTTP que siguen pendientes.
   */
  async function procesarRespuestas(): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, 0));
    TestBed.tick();
  }

  async function cargarSerie(): Promise<string> {
    http
      .expectOne('/api/productos')
      .flush([{ slug: 'platano', nombre: 'Plátano', descripcion: null, unidadBase: 'kg' }]);
    http.expectOne('/api/precios/series?producto=platano').flush(SERIES);
    await procesarRespuestas();
    const peticion = http.expectOne((r) => r.url.startsWith('/api/precios/serie?'));
    const url = peticion.request.urlWithParams;
    peticion.flush(SERIE);
    await fixture.whenStable();
    return url;
  }

  it('pide por defecto la primera serie disponible con un rango de 30 días', async () => {
    const url = await cargarSerie();
    const p = new URL(url, 'http://x').searchParams;
    expect(Object.fromEntries(p)).toEqual({
      producto: 'platano',
      fuente: 'sipsa',
      presentacion: 'hartón verde',
      mercado: '7',
      desde: '2026-10-14',
      hasta: '2026-11-13',
    });
  });

  it('muestra resumen, gráfica, tabla, fuente y cita', async () => {
    await cargarSerie();
    expect(texto()).toContain('Plátano hartón verde · Neiva, Surabastos');
    const resumen = Array.from(el().querySelectorAll('.resumen div')).map((d) =>
      [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent]
        .map((t) => (t ?? '').replace(/\s+/g, ' ').trim())
        .join(' '),
    );
    expect(resumen).toEqual(['Mínimo $ 1.933', 'Promedio $ 2.033', 'Máximo $ 2.133']);
    expect(el().querySelector('.grafica-falsa')?.textContent).toContain('2 puntos');
    const filas = Array.from(el().querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td'))
        .map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim())
        .join(' '),
    );
    expect(filas).toEqual(['13 nov 2026 $ 2.133', '12 nov 2026 $ 1.933']);
    expect(texto()).toContain(CITA);
    expect(texto()).toContain('no es lo que recibe el productor');
  });

  it('el rango "Todo" pide desde la primera fecha de la serie', async () => {
    await cargarSerie();
    fixture.componentRef.setInput('rango', 'max');
    await procesarRespuestas();
    const peticion = http.expectOne((r) => r.url.startsWith('/api/precios/serie?'));
    expect(peticion.request.urlWithParams).toContain('desde=2020-02-01');
    peticion.flush(SERIE);
    await fixture.whenStable();
    const activo = el().querySelector('.rango--activo');
    expect(activo?.textContent?.trim()).toBe('Todo');
    expect(activo?.getAttribute('aria-pressed')).toBe('true');
  });
});
