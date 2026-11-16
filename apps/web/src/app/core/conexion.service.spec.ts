import { TestBed } from '@angular/core/testing';
import { ConexionService } from './conexion.service';

describe('ConexionService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('toma el estado inicial de navigator.onLine', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const servicio = TestBed.inject(ConexionService);
    expect(servicio.enLinea()).toBe(false);
  });

  it('reacciona a los eventos online/offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const servicio = TestBed.inject(ConexionService);

    window.dispatchEvent(new Event('offline'));
    expect(servicio.enLinea()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(servicio.enLinea()).toBe(true);
  });
});
