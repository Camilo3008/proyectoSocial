/**
 * Advertencias de comparabilidad que se muestran junto a los precios
 * (docs/PROYECTO.md §7.1). Lenguaje cotidiano.
 */
export const NOTA_MAYORISTA =
  'Precio mayorista en central de abastos: incluye transporte y margen; no es lo que recibe el productor en la finca.';

export const NOTA_CAFE_NY =
  'Nueva York cotiza café verde (excelso), no pergamino: los dos precios no se comparan directamente.';

/** Notas que aplican a un precio según su fuente y su producto. */
export function notasDePrecio(
  fuente: string,
  producto: string,
  tieneComplementos: boolean,
): string[] {
  const notas: string[] = [];
  if (fuente === 'sipsa') notas.push(NOTA_MAYORISTA);
  if (producto === 'cafe' && tieneComplementos) notas.push(NOTA_CAFE_NY);
  return notas;
}
