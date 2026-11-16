/**
 * Valores de Cache-Control para las respuestas de lectura. Los datos cambian
 * como máximo una vez al día; el ETag (generado por Express) permite
 * revalidaciones baratas con 304.
 */
export const CACHE_CONTROL = {
  /** Catálogos casi estáticos (productos, fuentes). */
  catalogo: 'public, max-age=300, stale-while-revalidate=86400',
  /** Respuestas que no deben guardarse (salud, administración). */
  sinCache: 'no-store',
} as const;
