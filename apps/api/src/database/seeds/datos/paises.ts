import { createRequire } from 'node:module';
import paises from 'i18n-iso-countries';
import { type Pais } from '../../../catalogo/entities/pais.entity.js';

const require = createRequire(import.meta.url);
paises.registerLocale(require('i18n-iso-countries/langs/es.json') as paises.LocaleData);

type PaisSemilla = Pick<Pais, 'iso3' | 'iso2' | 'nombreEs'>;

/**
 * Países ISO 3166-1 con nombre en español, tomados del paquete
 * i18n-iso-countries (licencia MIT).
 *
 * region, lat y lng quedan en null: se completarán desde Natural Earth
 * (dominio público) en la etapa del globo.
 */
export function obtenerPaises(): PaisSemilla[] {
  return Object.entries(paises.getAlpha3Codes())
    .map(([iso3, iso2]) => ({
      iso3,
      iso2,
      nombreEs: paises.getName(iso2, 'es', { select: 'official' }) ?? iso3,
    }))
    .sort((a, b) => a.iso3.localeCompare(b.iso3));
}
