/**
 * Citas que la licencia de cada fuente exige mostrar junto a sus datos
 * (docs/fuentes/<slug>.md). Se envían en la API para que todo cliente las muestre.
 */
export const CITAS_FUENTE: Readonly<Record<string, string>> = {
  // Términos de uso del DANE, punto 2: cita textual obligatoria.
  sipsa: 'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co',
  // CC BY-SA 4.0: atribución.
  trm: 'Fuente: Superintendencia Financiera de Colombia (datos.gov.co), CC BY-SA 4.0',
  // CC BY 4.0 (docs/fuentes/worldbank.md): atribución, sin sugerir respaldo del Banco Mundial.
  worldbank: 'Fuente: Banco Mundial, Commodity Price Data (The Pink Sheet), CC BY 4.0',
  // Condiciones de uso de las bases de datos de la FAO, punto 3: formato de cita obligatorio.
  faostat:
    'FAO. 2026. FAOSTAT: Precios al productor. Consultado el 16 de noviembre de 2026. https://www.fao.org/faostat/ Licencia: CC-BY-4.0',
};

export function citaDe(slug: string): string | null {
  return CITAS_FUENTE[slug] ?? null;
}
