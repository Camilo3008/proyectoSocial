import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { formatearHace } from './formato';
import { FrescuraService, frescuraInterceptor } from './frescura';
import { SesionService, sesionInterceptor } from './sesion';

describe('formatearHace', () => {
  const ahora = new Date('2026-11-16T15:00:00Z');
  it('expresa la antigüedad en palabras', () => {
    expect(formatearHace(new Date('2026-11-16T14:59:40Z'), ahora)).toBe('hace un momento');
    expect(formatearHace(new Date('2026-11-16T14:55:00Z'), ahora)).toBe('hace 5 minutos');
    expect(formatearHace(new Date('2026-11-16T12:00:00Z'), ahora)).toBe('hace 3 horas');
    expect(formatearHace(new Date('2026-11-15T15:00:00Z'), ahora)).toBe('ayer');
    expect(formatearHace(new Date('2026-11-12T15:00:00Z'), ahora)).toBe('hace 4 días');
  });
});

describe('interceptores', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sesionInterceptor, frescuraInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('registra el encabezado Date de las lecturas de la API y detecta datos guardados', async () => {
    const frescura = TestBed.inject(FrescuraService);
    const respuesta = firstValueFrom(http.get('/api/precios/hoy'));
    const hace2Horas = new Date(Date.now() - 2 * 3_600_000).toUTCString();
    backend.expectOne('/api/precios/hoy').flush({}, { headers: { Date: hace2Horas } });
    await respuesta;

    expect(frescura.fechaRespuesta()?.toUTCString()).toBe(hace2Horas);
    expect(frescura.desdeCache()).toBe(true);

    const reciente = firstValueFrom(http.get('/api/fuentes'));
    backend.expectOne('/api/fuentes').flush([], { headers: { Date: new Date().toUTCString() } });
    await reciente;
    expect(frescura.desdeCache()).toBe(false);
  });

  it('agrega el token solo a /api/admin y cierra la sesión ante un 401', async () => {
    const sesion = TestBed.inject(SesionService);
    sesion.iniciar({
      accessToken: 'abc',
      tokenType: 'Bearer',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(sesion.activa()).toBe(true);

    void firstValueFrom(http.get('/api/precios/hoy'));
    expect(backend.expectOne('/api/precios/hoy').request.headers.has('Authorization')).toBe(false);

    const admin = firstValueFrom(http.get('/api/admin/ingestas')).catch(() => 'error');
    const peticion = backend.expectOne('/api/admin/ingestas');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer abc');
    peticion.flush({ message: 'No autorizado' }, { status: 401, statusText: 'Unauthorized' });
    expect(await admin).toBe('error');
    expect(sesion.activa()).toBe(false);
    expect(sessionStorage.getItem('agroprecios.sesion')).toBeNull();
  });
});
