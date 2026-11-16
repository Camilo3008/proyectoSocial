/**
 * Valores de Cache-Control para las respuestas de lectura. El ETag (generado
 * por Express) permite revalidaciones baratas con 304.
 *
 * El modo sin conexión lo da el service worker (ngsw-config.json), no la caché
 * HTTP del navegador; por eso las ventanas "stale" son cortas en los datos que
 * cambian: con una ventana larga el navegador mostraría precios viejos sin aviso
 * después de una ingesta.
 */
export const CACHE_CONTROL = {
  /** Catálogos casi estáticos (productos, mercados). */
  catalogo: 'public, max-age=300, stale-while-revalidate=86400',
  /** Datos que cambian con cada ingesta (precios, tasas, estado de fuentes). */
  datos: 'public, max-age=300, stale-while-revalidate=60',
  /** Respuestas que no deben guardarse (salud, administración). */
  sinCache: 'no-store',
} as const;
