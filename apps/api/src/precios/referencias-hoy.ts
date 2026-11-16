import { MERCADO_BOLSA_NY } from '../database/seeds/datos/mercados.js';

/** Criterio para elegir la serie de un precio de referencia. */
export interface CriterioReferencia {
  fuente: string;
  /** Nombre del mercado; null = sin mercado (referencia nacional). */
  mercado: string | null;
  presentacion: string;
}

export interface ConfigReferenciaHoy {
  principal: CriterioReferencia;
  complementos: (CriterioReferencia & { etiqueta: string })[];
}

/**
 * Qué precio se muestra en la pantalla "Hoy" para cada producto (RF-01).
 * Los productos sin configuración muestran su observación más reciente de
 * cualquier fuente.
 *
 * TODO(etapa-2): plátano, banano, cacao y pitaya con SIPSA, priorizando el
 * mercado mayorista más cercano a Pitalito (p. ej. Neiva) y luego Bogotá.
 */
export const REFERENCIAS_HOY: Record<string, ConfigReferenciaHoy> = {
  cafe: {
    // Precio interno de referencia FNC: carga de 125 kg de pergamino seco (docs/fuentes/fnc.md).
    principal: { fuente: 'fnc', mercado: null, presentacion: 'pergamino seco' },
    complementos: [
      {
        etiqueta: 'Bolsa de Nueva York',
        fuente: 'fnc',
        mercado: MERCADO_BOLSA_NY,
        presentacion: 'verde arábica (contrato C)',
      },
    ],
  },
};
