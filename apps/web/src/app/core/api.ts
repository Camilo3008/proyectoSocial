import { InjectionToken } from '@angular/core';

/** URL base de la API. En desarrollo el proxy de `ng serve` reenvía /api a localhost:3000. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
