import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

const HORAS_ENTRE_REVISIONES = 6;

/**
 * Avisa cuando el service worker ya descargó una versión nueva de la app.
 * No recarga solo: el usuario decide cuándo ("Nueva versión, toca para actualizar").
 */
@Injectable({ providedIn: 'root' })
export class ActualizacionService {
  private readonly sw = inject(SwUpdate, { optional: true });
  private readonly documento = inject(DOCUMENT);
  private readonly _disponible = signal(false);
  readonly disponible = this._disponible.asReadonly();

  constructor() {
    const sw = this.sw;
    if (!sw?.isEnabled) return;
    const sub = sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this._disponible.set(true));
    const intervalo = setInterval(
      () => void sw.checkForUpdate().catch(() => undefined),
      HORAS_ENTRE_REVISIONES * 3_600_000,
    );
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      clearInterval(intervalo);
    });
  }

  async actualizar(): Promise<void> {
    try {
      await this.sw?.activateUpdate();
    } finally {
      this.documento.location.reload();
    }
  }
}
