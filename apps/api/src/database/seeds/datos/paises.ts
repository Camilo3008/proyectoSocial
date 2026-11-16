import { createRequire } from 'node:module';
import paises from 'i18n-iso-countries';
import { type Pais } from '../../../catalogo/entities/pais.entity.js';

const require = createRequire(import.meta.url);
paises.registerLocale(require('i18n-iso-countries/langs/es.json') as paises.LocaleData);

/**
 * Región (ONU) y punto de etiqueta por ISO3, tomados de Natural Earth v5.1.2
 * (dominio público). Lo genera scripts/preparar-natural-earth.mjs
 * (ver docs/fuentes/naturalearth.md).
 */
const NATURAL_EARTH = require('./paises-natural-earth.json') as Record<
  string,
  { region: string | null; lat: number | null; lng: number | null }
>;

type PaisSemilla = Pick<Pais, 'iso3' | 'iso2' | 'nombreEs' | 'region' | 'lat' | 'lng'>;

const coordenada = (v: number | null | undefined) => (typeof v === 'number' ? v.toFixed(6) : null);

/**
 * Países ISO 3166-1 con nombre en español (i18n-iso-countries, licencia MIT) y,
 * cuando Natural Earth los trae, región y coordenadas. Lo que no trae queda en null.
 */
export function obtenerPaises(): PaisSemilla[] {
  return Object.entries(paises.getAlpha3Codes())
    .map(([iso3, iso2]) => {
      const ne = NATURAL_EARTH[iso3];
      return {
        iso3,
        iso2,
        nombreEs: paises.getName(iso2, 'es', { select: 'official' }) ?? iso3,
        region: ne?.region ?? null,
        lat: coordenada(ne?.lat),
        lng: coordenada(ne?.lng),
      };
    })
    .sort((a, b) => a.iso3.localeCompare(b.iso3));
}
