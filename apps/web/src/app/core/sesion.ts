import { type SesionDto } from '@agroprecios/shared';
import { type HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api';

const CLAVE = 'agroprecios.sesion';

/**
 * Sesión del administrador (único rol de la Fase 1). El token se guarda en
 * sessionStorage: se borra al cerrar la pestaña y no queda en el equipo.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly _sesion = signal<SesionDto | null>(this.leer());
  readonly sesion = this._sesion.asReadonly();
  readonly activa = computed(() => {
    const s = this._sesion();
    return !!s && new Date(s.expiraEn).getTime() > Date.now();
  });

  iniciar(sesion: SesionDto): void {
    this._sesion.set(sesion);
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
    } catch {
      // Sin almacenamiento (modo privado): la sesión dura mientras la página esté abierta.
    }
  }

  cerrar(): void {
    this._sesion.set(null);
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      // Nada que limpiar.
    }
  }

  private leer(): SesionDto | null {
    try {
      const texto = sessionStorage.getItem(CLAVE);
      return texto ? (JSON.parse(texto) as SesionDto) : null;
    } catch {
      return null;
    }
  }
}

/** Agrega el token a /api/admin/** y cierra la sesión si la API responde 401. */
export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(API_URL);
  if (!req.url.startsWith(`${api}/admin`)) return next(req);
  const sesion = inject(SesionService);
  const token = sesion.sesion()?.accessToken;
  const conToken = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(conToken).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) sesion.cerrar();
      return throwError(() => error);
    }),
  );
};
