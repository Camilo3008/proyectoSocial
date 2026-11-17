// Copia a public/vendor/ archivos de dependencias que se cargan de forma
// diferida (no van en el bundle inicial). Angular no permite assets fuera de
// apps/web y npm workspaces instala maplibre-gl en la raíz.
// - maplibre-gl.css: el globo lo inyecta solo al abrir /internacional.
// - maplibre-gl-worker.mjs: en MapLibre v6 el worker es un archivo aparte; el
//   globo le indica esta ruta con setWorkerUrl.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const destino = join(import.meta.dirname, '..', 'public', 'vendor');
mkdirSync(destino, { recursive: true });
for (const archivo of ['maplibre-gl.css', 'maplibre-gl-worker.mjs']) {
  copyFileSync(join(dist, archivo), join(destino, archivo));
}
