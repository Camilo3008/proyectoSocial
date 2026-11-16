import { type HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { API_URL } from './api';

/** Una respuesta con más de 15 min se considera servida desde la caché. */
export const MINUTOS_DATO_GUARDADO = 15;

/**
 * Antigüedad de los datos que se están mostrando. Se toma del encabezado
 * `Date` de la última respuesta de lectura de la API: cuando el service worker
 * responde desde su caché (sin conexión o conexión lenta), ese encabezado
 * conserva el momento en que el servidor la generó.
 */
@Injectable({ providedIn: 'root' })
export class FrescuraService {
  private readonly _fechaRespuesta = signal<Date | null>(null);
  readonly fechaRespuesta = this._fechaRespuesta.asReadonly();
  /** Se actualiza cada minuto para recalcular "hace X". */
  readonly ahora = signal(new Date());

  /** true si la última respuesta es claramente de la caché. */
  readonly desdeCache = computed(() => {
    const fecha = this._fechaRespuesta();
    if (!fecha) return false;
    return this.ahora().getTime() - fecha.getTime() > MINUTOS_DATO_GUARDADO * 60_000;
  });

  constructor() {
    if (typeof setInterval === 'function') setInterval(() => this.ahora.set(new Date()), 60_000);
  }

  registrar(encabezadoDate: string | null): void {
    if (!encabezadoDate) return;
    const fecha = new Date(encabezadoDate);
    if (!Number.isNaN(fecha.getTime())) {
      this._fechaRespuesta.set(fecha);
      this.ahora.set(new Date());
    }
  }
}

/** Registra el encabezado Date de las lecturas (GET) de la API pública. */
export const frescuraInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(API_URL);
  if (req.method !== 'GET' || !req.url.startsWith(api) || req.url.startsWith(`${api}/admin`)) {
    return next(req);
  }
  const frescura = inject(FrescuraService);
  return next(req).pipe(
    tap((evento) => {
      if (evento instanceof HttpResponse) frescura.registrar(evento.headers.get('date'));
    }),
  );
};
