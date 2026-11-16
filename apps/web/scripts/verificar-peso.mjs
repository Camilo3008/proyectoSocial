// Verifica el presupuesto de rendimiento de CLAUDE.md: bundle inicial < 200 kB gzip.
// Los budgets de angular.json miden tamaño SIN comprimir; este script mide gzip
// de todo lo que se descarga al abrir la app: lo que index.html carga (scripts,
// modulepreload y CSS) MÁS los chunks que esos scripts importan de forma
// estática (los import() dinámicos son carga diferida y no cuentan).
// Hace fallar el build si se excede el límite.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMITE_KB = 200;
const carpeta = join(import.meta.dirname, '..', 'dist', 'web', 'browser');
const html = readFileSync(join(carpeta, 'index.html'), 'utf8');

const pendientes = [];
for (const [, ruta] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) pendientes.push(ruta);
for (const [, ruta] of html.matchAll(/<link[^>]+href="([^"]+\.(?:js|css))"/g))
  pendientes.push(ruta);

// Imports estáticos en ESM minificado: `import{a}from"./chunk-X.js"`, `import"./chunk-Y.js"`,
// `export{b}from"./chunk-Z.js"`. No coincide con `import("./chunk-W.js")` (dinámico).
const IMPORT_ESTATICO =
  /(?:\bimport|\bexport)\s*(?:[\w*{}\s,$]*?\bfrom\s*)?["'](\.\/[^"']+\.js)["']/g;

const iniciales = new Set(['index.html']);
while (pendientes.length > 0) {
  const ruta = pendientes.pop().replace(/^\.\//, '');
  if (iniciales.has(ruta)) continue;
  iniciales.add(ruta);
  if (ruta.endsWith('.js')) {
    const codigo = readFileSync(join(carpeta, ruta), 'utf8');
    for (const [, importado] of codigo.matchAll(IMPORT_ESTATICO)) {
      if (existsSync(join(carpeta, importado))) pendientes.push(importado);
    }
  }
}

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
