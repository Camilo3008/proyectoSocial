// Escala de colores de la coropleta. Está separada de globo.ts para que la
// página la use sin traer el componente del globo al chunk de la ruta (@defer).

/** Escala secuencial apta para daltonismo (viridis, de menor a mayor precio). */
export const COLORES_CLASES = ['#fde725', '#5ec962', '#21918c', '#3b528b', '#440154'];
export const COLOR_SIN_DATOS = '#c9ccc6';

/** Límites de las 5 clases (quintiles) a partir de los valores en USD/kg. */
export function calcularClases(valores: number[]): number[] {
  const ordenados = [...valores].sort((a, b) => a - b);
  if (ordenados.length === 0) return [];
  return [1, 2, 3, 4].map(
    (q) => ordenados[Math.floor((q * ordenados.length) / 5)] ?? ordenados.at(-1)!,
  );
}

/** Índice de clase (0-4) de un valor según los límites. */
export function claseDe(valor: number, limites: number[]): number {
  let clase = 0;
  for (const limite of limites) if (valor >= limite) clase++;
  return Math.min(clase, COLORES_CLASES.length - 1);
}
