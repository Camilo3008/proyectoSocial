import { type FuenteDto } from '@agroprecios/shared';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FuentesPage } from './fuentes.page';

registerLocaleData(localeEsCo, 'es-CO');

const FUENTES: FuenteDto[] = [
  {
    slug: 'trm',
    nombre: 'TRM – Tasa Representativa del Mercado (datos.gov.co)',
    tipo: 'OFICIAL_NACIONAL',
    url: 'https://www.datos.gov.co/',
    licencia: null,
    frecuencia: 'DIARIA',
    ultimaIngestaExitosa: '2026-11-14T13:00:00.000Z',
    estado: 'AL_DIA',
  },
  {
    slug: 'manual',
    nombre: 'Carga manual del administrador',
    tipo: 'MANUAL',
    url: null,
    licencia: null,
    frecuencia: 'DIARIA',
    ultimaIngestaExitosa: null,
    estado: 'NO_APLICA',
  },
];

describe('FuentesPage', () => {
  let fixture: ComponentFixture<FuentesPage>;
  let http: HttpTestingController;
  const elemento = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuentesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-CO' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FuentesPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra "Cargando" mientras llega la respuesta', () => {
    expect(elemento().textContent).toContain('Cargando fuentes');
    http.expectOne('/api/fuentes');
  });

  it('lista las fuentes con estado, fecha en es-CO y licencia por verificar', async () => {
    http.expectOne('/api/fuentes').flush(FUENTES);
    await fixture.whenStable();

    const tarjetas = elemento().querySelectorAll('li.fuente');
    expect(tarjetas.length).toBe(2);

    const trm = tarjetas[0]!.textContent ?? '';
    expect(trm).toContain('Al día');
    expect(trm).toMatch(/14 nov\.? 2026/);
    expect(trm).toContain('Por verificar');
    expect(tarjetas[0]!.querySelector('a')?.getAttribute('rel')).toContain('noopener');

    const manual = tarjetas[1]!.textContent ?? '';
    expect(manual).toContain('Carga manual');
    expect(manual).toContain('Todavía no hay datos');
    expect(tarjetas[1]!.querySelector('a')).toBeNull();
  });

  it('muestra un error con opción de reintentar si la API falla', async () => {
    http
      .expectOne('/api/fuentes')
      .flush('error', { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar las fuentes',
    );

    (elemento().querySelector('button') as HTMLButtonElement).click();
    // tick() ejecuta el efecto del recurso sin esperar la respuesta HTTP pendiente.
    TestBed.tick();
    http.expectOne('/api/fuentes').flush(FUENTES);
    await fixture.whenStable();
    expect(elemento().querySelectorAll('li.fuente').length).toBe(2);
  });
});
