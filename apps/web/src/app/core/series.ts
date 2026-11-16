import { type SerieDisponibleDto } from '@agroprecios/shared';

/** Clave estable de una serie para usarla en un <select>. */
export function claveSerie(s: {
  fuente: { slug: string };
  mercado: { id: number } | null;
  presentacion: string;
}): string {
  return `${s.fuente.slug}|${s.mercado?.id ?? ''}|${s.presentacion}`;
}

/** Texto de una serie: "Neiva, Surabastos · hartón verde (DANE – SIPSA)". */
export function etiquetaSerie(s: SerieDisponibleDto): string {
  const donde = s.mercado ? s.mercado.nombre : 'Referencia nacional';
  return `${donde} · ${s.presentacion} (${s.fuente.nombre})`;
}

export type Rango = '7d' | '30d' | '6m' | '1a' | 'max';

export const RANGOS: { valor: Rango; etiqueta: string }[] = [
  { valor: '7d', etiqueta: '7 días' },
  { valor: '30d', etiqueta: '30 días' },
  { valor: '6m', etiqueta: '6 meses' },
  { valor: '1a', etiqueta: '1 año' },
  { valor: 'max', etiqueta: 'Todo' },
];

/** Fecha inicial de un rango que termina en `hasta` (AAAA-MM-DD). */
export function desdeDeRango(rango: Rango, hasta: string, primeraFecha: string): string {
  const d = new Date(`${hasta}T00:00:00Z`);
  switch (rango) {
    case '7d':
      d.setUTCDate(d.getUTCDate() - 7);
      break;
    case '30d':
      d.setUTCDate(d.getUTCDate() - 30);
      break;
    case '6m':
      d.setUTCMonth(d.getUTCMonth() - 6);
      break;
    case '1a':
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      break;
    case 'max':
      return primeraFecha;
  }
  const desde = d.toISOString().slice(0, 10);
  return desde < primeraFecha ? primeraFecha : desde;
}
