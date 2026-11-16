import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Estado de la conexión del navegador como signal (online/offline). */
@Injectable({ providedIn: 'root' })
export class ConexionService {
  private readonly ventana = inject(DOCUMENT).defaultView;
  private readonly _enLinea = signal(this.ventana?.navigator.onLine ?? true);

  /** true si el navegador reporta conexión. */
  readonly enLinea = this._enLinea.asReadonly();

  constructor() {
    const ventana = this.ventana;
    if (!ventana) {
      return;
    }
    const alConectar = () => this._enLinea.set(true);
    const alDesconectar = () => this._enLinea.set(false);
    ventana.addEventListener('online', alConectar);
    ventana.addEventListener('offline', alDesconectar);
    inject(DestroyRef).onDestroy(() => {
      ventana.removeEventListener('online', alConectar);
      ventana.removeEventListener('offline', alDesconectar);
    });
  }
}
