import { createHash } from 'node:crypto';

/**
 * User-Agent identificable para todas las descargas de fuentes (CLAUDE.md).
 * No incluye datos personales.
 */
export const USER_AGENT = 'AgroPrecios/0.1 (proyecto social; precios agricolas de referencia)';

/** Descarga un recurso como texto. Una sola petición, sin reintentos. */
export async function descargarTexto(url: string, signal?: AbortSignal): Promise<string> {
  const respuesta = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal,
  });
  if (!respuesta.ok) {
    throw new Error(`La fuente respondió HTTP ${respuesta.status} ${respuesta.statusText}`);
  }
  return respuesta.text();
}

export function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}
