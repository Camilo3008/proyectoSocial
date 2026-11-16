/**
 * Advertencias de comparabilidad que se muestran junto a los precios
 * (docs/PROYECTO.md §7.1). Lenguaje cotidiano.
 */
export const NOTA_MAYORISTA =
  'Precio mayorista en central de abastos: incluye transporte y margen; no es lo que recibe el productor en la finca.';

export const NOTA_CAFE_NY =
  'Nueva York cotiza café verde (excelso), no pergamino: los dos precios no se comparan directamente.';

export const NOTA_INTERNACIONAL =
  'Precio internacional en dólares (promedio del mes): sirve como referencia del mercado mundial, no es el precio que se paga en Colombia.';

/** Advertencia al comparar la serie internacional con la nacional de cada producto. */
export const NOTAS_COMPARACION: Readonly<Record<string, string>> = {
  cafe: 'El precio internacional es café verde (excelso) puesto en puerto; el nacional (FNC) es café pergamino seco. Son presentaciones distintas: compárelos solo como tendencia.',
  banano:
    'El precio internacional es banano de importación en EE. UU. y Europa; el nacional es el precio mayorista en una central de abastos colombiana. Compárelos solo como tendencia.',
  cacao:
    'Es el precio en las bolsas de Nueva York y Londres. Todavía no hay una fuente nacional verificada del precio del cacao.',
};

/** Notas que aplican a un precio según su fuente y su producto. */
export function notasDePrecio(
  fuente: string,
  producto: string,
  tieneComplementos: boolean,
): string[] {
  const notas: string[] = [];
  if (fuente === 'sipsa') notas.push(NOTA_MAYORISTA);
  if (fuente === 'worldbank') notas.push(NOTA_INTERNACIONAL);
  if (producto === 'cafe' && tieneComplementos) notas.push(NOTA_CAFE_NY);
  return notas;
}
