// Verifica el presupuesto de rendimiento de CLAUDE.md: bundle inicial < 200 kB gzip.
// Los budgets de angular.json miden tamaño SIN comprimir; este script mide gzip
// de los archivos que index.html carga de entrada (scripts, modulepreload y CSS)
// y hace fallar el build si se excede el límite.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMITE_KB = 200;
const carpeta = join(import.meta.dirname, '..', 'dist', 'web', 'browser');
const html = readFileSync(join(carpeta, 'index.html'), 'utf8');

const iniciales = new Set();
for (const [, ruta] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) iniciales.add(ruta);
for (const [, ruta] of html.matchAll(/<link[^>]+href="([^"]+\.(?:js|css))"/g)) iniciales.add(ruta);
iniciales.add('index.html');

let total = 0;
const filas = [];
for (const ruta of iniciales) {
  const bytes = gzipSync(readFileSync(join(carpeta, ruta)), { level: 9 }).length;
  total += bytes;
  filas.push({ archivo: ruta, 'gzip (kB)': (bytes / 1000).toFixed(1) });
}

console.table(filas);
const totalKb = total / 1000;
console.log(`Bundle inicial: ${totalKb.toFixed(1)} kB gzip (límite ${LIMITE_KB} kB)`);

if (totalKb > LIMITE_KB) {
  console.error('ERROR: el bundle inicial excede el presupuesto de rendimiento.');
  process.exit(1);
}
