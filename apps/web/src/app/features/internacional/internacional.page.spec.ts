import { type CommoditiesDto } from '@agroprecios/shared';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GraficaLinea, type SerieGrafica } from '../../shared/grafica-linea/grafica-linea';
import { InternacionalPage } from './internacional.page';

/** jsdom no tiene <canvas>: la gráfica se reemplaza por un doble que expone sus series. */
@Component({
  selector: 'ap-grafica-linea',
  template: `@for (s of series(); track s.nombre) {
    <p class="linea">{{ s.nombre }}: {{ s.valores.join(',') }}</p>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GraficaFalsa {
  readonly etiquetas = input.required<string[]>();
  readonly series = input.required<SerieGrafica[]>();
  readonly formatear = input<(v: number) => string>();
}

const CITA_WB = 'Fuente: Banco Mundial, Commodity Price Data (The Pink Sheet), CC BY 4.0';

// DATO DE EJEMPLO: forma real de la API; los USD son los del archivo real del Banco Mundial.
const CAFE: CommoditiesDto = {
  producto: { slug: 'cafe', nombre: 'Café' },
  fuente: {
    slug: 'worldbank',
    nombre: 'Banco Mundial – Commodity Price Data (Pink Sheet)',
    cita: CITA_WB,
  },
  desde: '2026-09-01',
  hasta: '2026-10-01',
  series: [
    {
      presentacion: 'verde arábica (indicador ICO)',
      items: [
        { fecha: '2026-09-01', valorUsdKg: '7.2600', valorCopKg: '28000.0000' },
        { fecha: '2026-10-01', valorUsdKg: '7.4000', valorCopKg: '28500.0000' },
      ],
    },
    {
      presentacion: 'verde robusta (indicador ICO)',
      items: [
        { fecha: '2026-09-01', valorUsdKg: '3.6900', valorCopKg: '14200.0000' },
        { fecha: '2026-10-01', valorUsdKg: '3.6300', valorCopKg: null },
      ],
    },
  ],
  nacional: {
    fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros', cita: null },
    mercado: null,
    presentacion: 'pergamino seco',
    items: [{ fecha: '2026-10-01', valorCopKg: '16400.0000' }],
  },
};

describe('InternacionalPage', () => {
  let fixture: ComponentFixture<InternacionalPage>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const lineas = () =>
    Array.from(el().querySelectorAll('.linea')).map((p) => (p.textContent ?? '').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternacionalPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideComponent(InternacionalPage, {
        remove: { imports: [GraficaLinea] },
        add: { imports: [GraficaFalsa] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(InternacionalPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('pide el café de los últimos 2 años por defecto', () => {
    const peticion = http.expectOne((r) => r.url.startsWith('/api/internacional/commodities?'));
    const p = new URL(peticion.request.urlWithParams, 'http://x').searchParams;
    expect(p.get('producto')).toBe('cafe');
    expect(p.get('desde')).toMatch(/^\d{4}-\d{2}-01$/);
    peticion.flush(CAFE);
  });

  it('resume el último mes de cada serie con su variación y el equivalente en pesos', async () => {
    http.expectOne((r) => r.url.startsWith('/api/internacional/commodities?')).flush(CAFE);
    await fixture.whenStable();

    const tarjetas = Array.from(el().querySelectorAll('.resumen li')).map((li) =>
      (li.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(tarjetas[0]).toContain('Café verde arábica (indicador ICO)');
    expect(tarjetas[0]).toContain('US$ 7,40');
    expect(tarjetas[0]).toMatch(/≈ \$ 28\.500 por kilo/);
    expect(tarjetas[0]).toContain('▲ Subió 1,93 % frente a septiembre de 2026');
    expect(tarjetas[0]).toContain('Promedio de octubre de 2026');
    // Sin TRM del mes: no se muestra el equivalente en pesos.
    expect(tarjetas[1]).not.toContain('≈');
  });

  it('en pesos grafica las series internacionales y el precio en Colombia; en dólares solo las internacionales', async () => {
    http.expectOne((r) => r.url.startsWith('/api/internacional/commodities?')).flush(CAFE);
    await fixture.whenStable();
    expect(lineas()).toEqual([
      'Internacional: verde arábica (indicador ICO): 28000,28500',
      'Internacional: verde robusta (indicador ICO): 14200,',
      'Colombia: pergamino seco: ,16400',
    ]);

    fixture.componentRef.setInput('moneda', 'USD');
    await fixture.whenStable();
    expect(lineas()).toEqual([
      'Internacional: verde arábica (indicador ICO): 7.26,7.4',
      'Internacional: verde robusta (indicador ICO): 3.69,3.63',
    ]);
  });

  it('muestra la advertencia de comparabilidad, la cita y la tabla', async () => {
    http.expectOne((r) => r.url.startsWith('/api/internacional/commodities?')).flush(CAFE);
    await fixture.whenStable();
    expect(texto()).toContain('Son presentaciones distintas: compárelos solo como tendencia');
    expect(texto()).toContain(CITA_WB);
    const filas = Array.from(el().querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('th, td'))
        .map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())
        .join(' | '),
    );
    expect(filas).toEqual([
      'octubre de 2026 | $ 28.500 | — | $ 16.400',
      'septiembre de 2026 | $ 28.000 | $ 14.200 | —',
    ]);
  });
});
