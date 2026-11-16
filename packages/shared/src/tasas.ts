/** Valor de la TRM en una fecha: COP por 1 USD (texto decimal). */
export interface TasaDiaDto {
  fecha: string;
  valor: string;
}

/** GET /api/tasas/trm */
export interface SerieTrmDto {
  fuente: {
    slug: string;
    nombre: string;
    /** La TRM se redistribuye bajo CC BY-SA 4.0 (docs/fuentes/trm.md). */
    licencia: string | null;
  };
  desde: string;
  hasta: string;
  items: TasaDiaDto[];
}
