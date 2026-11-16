// Prepara los datos de Natural Earth (dominio público) para AgroPrecios.
// Uso: node scripts/preparar-natural-earth.mjs <ruta a ne_110m_admin_0_countries.geojson>
// Fuente verificada: docs/fuentes/naturalearth.md (v5.1.2).
//
// Genera:
//  - apps/web/public/geo/paises.geojson  (solo iso3 y nombre; coordenadas a 2 decimales)
//  - apps/api/src/database/seeds/datos/paises-natural-earth.json  (región y punto de etiqueta)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const entrada = process.argv[2];
if (!entrada) {
  console.error('Uso: node scripts/preparar-natural-earth.mjs <geojson de Natural Earth>');
  process.exit(1);
}
const raiz = join(import.meta.dirname, '..');
const original = JSON.parse(readFileSync(entrada, 'utf8'));

const redondear = (coordenadas) =>
  typeof coordenadas[0] === 'number'
    ? [Math.round(coordenadas[0] * 100) / 100, Math.round(coordenadas[1] * 100) / 100]
    : coordenadas.map(redondear);

/** Quita vértices consecutivos repetidos que deja el redondeo (anillos de polígono). */
const limpiarAnillo = (anillo) => {
  const salida = anillo.filter(
    (p, i) => i === 0 || p[0] !== anillo[i - 1][0] || p[1] !== anillo[i - 1][1],
  );
  return salida.length >= 4 ? salida : anillo;
};
const limpiar = (geometria) => {
  if (geometria.type === 'Polygon')
    return { ...geometria, coordinates: geometria.coordinates.map(limpiarAnillo) };
  if (geometria.type === 'MultiPolygon') {
    return { ...geometria, coordinates: geometria.coordinates.map((p) => p.map(limpiarAnillo)) };
  }
  return geometria;
};

const referencia = {};
const features = original.features.map((f) => {
  const p = f.properties;
  // ISO_A3 viene en -99 para Francia y Noruega; ISO_A3_EH sí los trae.
  const iso3 = p.ISO_A3_EH && p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : null;
  if (iso3) {
    referencia[iso3] = {
      region: p.REGION_UN ?? null,
      lat: p.LABEL_Y ?? null,
      lng: p.LABEL_X ?? null,
    };
  }
  return {
    type: 'Feature',
    properties: { iso3, nombre: p.NAME_ES ?? p.NAME },
    geometry: limpiar({ ...f.geometry, coordinates: redondear(f.geometry.coordinates) }),
  };
});

const geojson = {
  type: 'FeatureCollection',
  // Natural Earth es de dominio público; se deja la procedencia para trazabilidad.
  fuente: 'Natural Earth v5.1.2, ne_110m_admin_0_countries (dominio público)',
  features,
};

const salidaWeb = join(raiz, 'apps/web/public/geo/paises.geojson');
const salidaApi = join(raiz, 'apps/api/src/database/seeds/datos/paises-natural-earth.json');
mkdirSync(dirname(salidaWeb), { recursive: true });
writeFileSync(salidaWeb, JSON.stringify(geojson));
writeFileSync(salidaApi, `${JSON.stringify(referencia, null, 2)}\n`);
console.log(`Países: ${features.length} (con ISO: ${Object.keys(referencia).length})`);
console.log(`${salidaWeb}: ${(JSON.stringify(geojson).length / 1024).toFixed(0)} KB`);
