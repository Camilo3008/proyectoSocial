// Copia a public/vendor/ las hojas de estilo de dependencias que se cargan de
// forma diferida (no van en el bundle inicial). Hoy: maplibre-gl.css, que el
// globo inyecta solo al abrir /internacional. Angular no permite assets fuera
// de apps/web y npm workspaces instala maplibre-gl en la raíz.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const origen = join(
  dirname(require.resolve('maplibre-gl/package.json')),
  'dist',
  'maplibre-gl.css',
);
const destino = join(import.meta.dirname, '..', 'public', 'vendor');
mkdirSync(destino, { recursive: true });
copyFileSync(origen, join(destino, 'maplibre-gl.css'));
