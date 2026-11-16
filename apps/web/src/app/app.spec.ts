import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { FrescuraService } from './core/frescura';

describe('App (shell)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('muestra la barra inferior con las cuatro pestañas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const enlaces = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav[aria-label] a'),
    );

    expect(enlaces.map((a) => a.textContent?.trim())).toEqual([
      'Hoy',
      'Histórico',
      'Mundo',
      'Fuentes',
    ]);
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/historico',
      '/internacional',
      '/fuentes',
    ]);
  });

  it('no muestra el aviso sin conexión cuando hay conexión', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.aviso-offline')).toBeNull();
  });

  it('sin conexión dice de cuándo son los datos mostrados', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    TestBed.inject(FrescuraService).registrar(new Date(Date.now() - 3 * 3_600_000).toUTCString());
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.aviso-offline')?.textContent?.trim(),
    ).toBe('Sin conexión · datos de hace 3 horas');
  });

  it('con conexión pero datos de la caché avisa que la conexión está lenta', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    TestBed.inject(FrescuraService).registrar(new Date(Date.now() - 3 * 86_400_000).toUTCString());
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.aviso-offline')?.textContent?.trim(),
    ).toBe('Conexión lenta · mostrando datos de hace 3 días');
  });
});
