import { createRequire } from 'node:module';

// src/common/version.ts y dist/common/version.js están a la misma profundidad.
const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export const VERSION_API = version;
