import { type IngestaEjecucionDto, type ObservacionPrecioDto } from '@agroprecios/shared';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SesionService, sesionInterceptor } from '../../core/sesion';
import { AdminPage, hoyBogota, mensajeError, normalizarValor } from './admin.page';

// DATO DE EJEMPLO: forma real de la API.
const OBS: ObservacionPrecioDto = {
  id: '7',
  producto: { slug: 'cafe', nombre: 'Café' },
  fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros' },
  mercado: null,
  paisIso3: 'COL',
  fecha: '2026-11-13',
  periodicidad: 'DIARIA',
  presentacion: 'pergamino seco',
  valor: '2075000.0000',
  moneda: 'COP',
  unidad: 'carga 125 kg',
  valorCopKg: '16600.0000',
  valorUsdKg: '4.2000',
  anulado: false,
  motivoAnulacion: null,
  creadoEn: '2026-11-16T15:00:00.000Z',
};

describe('utilidades del panel', () => {
  it('normaliza el valor digitado al formato de la API', () => {
    expect(normalizarValor('2.075.000')).toBe('2075000');
    expect(normalizarValor('$ 2.075.000')).toBe('2075000');
    expect(normalizarValor('278,65')).toBe('278.65');
    expect(normalizarValor('2.075.000,5')).toBe('2075000.5');
    expect(normalizarValor('278.65')).toBe('278.65');
  });

  it('calcula la fecha de hoy en Bogotá', () => {
    // 03:00 UTC del 17 = 22:00 del 16 en Bogotá.
    expect(hoyBogota(new Date('2026-11-17T03:00:00Z'))).toBe('2026-11-16');
  });

  it('traduce los errores de la API', () => {
    const error = (status: number, cuerpo: unknown) =>
      new HttpErrorResponse({ status, error: cuerpo });
    expect(mensajeError(error(400, { message: ['valor inválido', 'fecha inválida'] }))).toBe(
      'valor inválido. fecha inválida',
    );
    expect(mensajeError(error(409, { message: 'Ya existe' }))).toBe('Ya existe');
    expect(mensajeError(error(0, null))).toBe('No hay conexión con el servidor.');
  });
});

describe('AdminPage', () => {
  let fixture: ComponentFixture<AdminPage>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [
        provideHttpClient(withInterceptors([sesionInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Sin whenStable: con peticiones HTTP pendientes nunca se estabiliza. */
  const estabilizar = async () => {
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
  };

  const crear = async () => {
    fixture = TestBed.createComponent(AdminPage);
    await estabilizar();
  };

  /** Responde las cargas iniciales del panel con sesión activa. */
  const responderPanel = async () => {
    http.expectOne('/api/fuentes').flush([]);
    http.expectOne('/api/productos').flush([]);
    http.expectOne('/api/mercados').flush([]);
    http.expectOne('/api/admin/ingestas?limite=20').flush([]);
    http.expectOne('/api/admin/precios?limite=20').flush([OBS]);
    await estabilizar();
  };

  const iniciarSesion = () =>
    TestBed.inject(SesionService).iniciar({
      accessToken: 'token-prueba',
      tokenType: 'Bearer',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    });

  it('sin sesión muestra el acceso y no consulta datos de administración', async () => {
    await crear();
    expect(texto()).toContain('Acceso del administrador');
    http.expectNone((r) => r.url.startsWith('/api/admin'));
  });

  it('inicia sesión y luego carga el panel', async () => {
    await crear();
    el().querySelector<HTMLInputElement>('[name=email]')!.value = 'admin@ejemplo.org';
    el().querySelector<HTMLInputElement>('[name=password]')!.value = 'secreta';
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    const login = http.expectOne('/api/auth/login');
    expect(login.request.body).toEqual({ email: 'admin@ejemplo.org', password: 'secreta' });
    login.flush({
      accessToken: 'nuevo',
      tokenType: 'Bearer',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    });
    await estabilizar();
    await responderPanel();
    expect(texto()).toContain('Ingestas');
    expect(texto()).toContain('Café pergamino seco');
  });

  it('ejecuta una ingesta con el token y muestra el resultado', async () => {
    iniciarSesion();
    await crear();
    await responderPanel();

    el().querySelector<HTMLButtonElement>('.lista-fuentes button')!.click();
    const peticion = http.expectOne('/api/admin/ingesta/trm');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-prueba');
    peticion.flush({
      id: 1,
      fuente: 'trm',
      disparo: 'MANUAL',
      inicio: '2026-11-16T15:00:00.000Z',
      fin: '2026-11-16T15:00:02.000Z',
      estado: 'OK',
      leidos: 40,
      insertados: 1,
      actualizados: 0,
      mercadosNuevos: 0,
      error: null,
      payloadHash: null,
    } satisfies IngestaEjecucionDto);
    await estabilizar();
    http.expectOne('/api/admin/ingestas?limite=20').flush([]);
    http.expectOne('/api/fuentes').flush([]);
    await estabilizar();
    expect(texto()).toContain('trm: OK · leídos 40, nuevos 1, actualizados 0');
  });

  it('carga un precio normalizando el valor y muestra el resultado', async () => {
    iniciarSesion();
    await crear();
    await responderPanel();

    const formulario = el().querySelectorAll('form')[0]!;
    const campo = (nombre: string) =>
      formulario.querySelector<HTMLInputElement | HTMLSelectElement>(`[name=${nombre}]`)!;
    // Los selects vienen vacíos en la prueba: se agregan las opciones.
    for (const [nombre, valor] of [
      ['producto', 'cafe'],
      ['fuente', 'fnc'],
    ]) {
      const select = campo(nombre!) as HTMLSelectElement;
      select.add(new Option(valor, valor, true, true));
    }
    campo('fecha').value = '2026-11-13';
    campo('valor').value = '2.075.000';
    campo('referencia').value = 'Boletín FNC del 13/11/2026';
    formulario.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne('/api/admin/precios');
    expect(peticion.request.body).toEqual({
      producto: 'cafe',
      fuente: 'fnc',
      fecha: '2026-11-13',
      presentacion: 'pergamino seco',
      valor: '2075000',
      moneda: 'COP',
      unidad: 'carga 125 kg',
      referencia: 'Boletín FNC del 13/11/2026',
    });
    peticion.flush(OBS);
    await estabilizar();
    http.expectOne('/api/admin/precios?limite=20').flush([OBS]);
    await estabilizar();
    expect(texto()).toMatch(/Guardado: Café pergamino seco, 13 nov 2026 \(\$ 16\.600 por kilo\)/);
  });

  it('anula un precio con motivo', async () => {
    iniciarSesion();
    await crear();
    await responderPanel();

    const botonAnular = Array.from(
      el().querySelectorAll<HTMLButtonElement>('.lista-precios button'),
    )[0]!;
    botonAnular.click();
    await estabilizar();
    const form = el().querySelector<HTMLFormElement>('.anulacion')!;
    form.querySelector<HTMLInputElement>('[name=motivo]')!.value = 'Valor digitado por error';
    form.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne('/api/admin/precios/7/anular');
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ motivo: 'Valor digitado por error' });
    peticion.flush({ ...OBS, anulado: true, motivoAnulacion: 'Valor digitado por error' });
    await estabilizar();
    http
      .expectOne('/api/admin/precios?limite=20')
      .flush([{ ...OBS, anulado: true, motivoAnulacion: 'Valor digitado por error' }]);
    await estabilizar();
    expect(texto()).toContain('Anulado: Valor digitado por error');
  });
});
