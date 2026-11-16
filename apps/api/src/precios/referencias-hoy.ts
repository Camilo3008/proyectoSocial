import { MERCADO_BOLSA_NY } from '../database/seeds/datos/mercados.js';

/** Criterio para elegir la serie de un precio de referencia. */
export interface CriterioReferencia {
  fuente: string;
  presentacion: string;
  /** Nombre del mercado; null = sin mercado (referencia nacional). */
  mercado?: string | null;
  /**
   * Códigos del mercado en la fuente, en orden de preferencia (el más cercano a
   * Pitalito primero). Se usa el primero con datos recientes.
   */
  mercadosPreferidos?: string[];
}

export interface ConfigReferenciaHoy {
  principal: CriterioReferencia;
  complementos: (CriterioReferencia & { etiqueta: string })[];
}

/**
 * Mercados SIPSA (código fuenId) por cercanía a Pitalito: Neiva (Huila, mismo
 * departamento), Popayán (Cauca) y, como respaldo nacional, Bogotá Corabastos.
 * Verificados en la respuesta real (docs/fuentes/sipsa.md).
 */
export const MERCADOS_SIPSA_CERCANOS = ['22', '15', '1'];

/** Un mercado preferido cuenta como "reciente" si tiene datos en estos días. */
export const DIAS_DATO_RECIENTE = 10;

/**
 * Qué precio se muestra en la pantalla "Hoy" para cada producto (RF-01).
 * Los productos sin configuración muestran su observación más reciente de
 * cualquier fuente.
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
  platano: {
    principal: {
      fuente: 'sipsa',
      presentacion: 'hartón verde',
      mercadosPreferidos: MERCADOS_SIPSA_CERCANOS,
    },
    complementos: [
      {
        etiqueta: 'Plátano guineo',
        fuente: 'sipsa',
        presentacion: 'guineo',
        mercadosPreferidos: MERCADOS_SIPSA_CERCANOS,
      },
    ],
  },
  // Sin fuente nacional verificada (pregunta abierta 9): se muestra el precio internacional
  // del Banco Mundial, claramente rotulado (decisión del autor, 2026-11-16).
  cacao: {
    principal: { fuente: 'worldbank', presentacion: 'en grano (ICCO)', mercado: null },
    complementos: [],
  },
  banano: {
    principal: {
      fuente: 'sipsa',
      presentacion: 'banano',
      mercadosPreferidos: MERCADOS_SIPSA_CERCANOS,
    },
    complementos: [],
  },
};
