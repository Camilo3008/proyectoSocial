/**
 * Citas que la licencia de cada fuente exige mostrar junto a sus datos
 * (docs/fuentes/<slug>.md). Se envían en la API para que todo cliente las muestre.
 */
export const CITAS_FUENTE: Readonly<Record<string, string>> = {
  // Términos de uso del DANE, punto 2: cita textual obligatoria.
  sipsa: 'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co',
  // CC BY-SA 4.0: atribución.
  trm: 'Fuente: Superintendencia Financiera de Colombia (datos.gov.co), CC BY-SA 4.0',
};

export function citaDe(slug: string): string | null {
  return CITAS_FUENTE[slug] ?? null;
}
