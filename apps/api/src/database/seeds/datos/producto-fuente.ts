/**
 * Mapeo de nuestros productos a los códigos de cada fuente. Solo códigos
 * VERIFICADOS en la respuesta real de la fuente (docs/fuentes/<slug>.md).
 */
export interface MapeoSemilla {
  producto: string;
  fuente: string;
  codigoExterno: string;
  /** Presentación con la que se guardan las observaciones de este código. */
  presentacion: string;
  notas: string;
}

export const PRODUCTO_FUENTE: MapeoSemilla[] = [
  {
    producto: 'platano',
    fuente: 'sipsa',
    codigoExterno: '35',
    presentacion: 'hartón verde',
    notas: 'SIPSA promediosSipsaParcial, idArtiSemana 35: "Plátano hartón verde"',
  },
  {
    producto: 'platano',
    fuente: 'sipsa',
    codigoExterno: '34',
    presentacion: 'guineo',
    notas: 'SIPSA promediosSipsaParcial, idArtiSemana 34: "Plátano guineo"',
  },
  {
    producto: 'banano',
    fuente: 'sipsa',
    codigoExterno: '15',
    presentacion: 'banano',
    notas:
      'SIPSA promediosSipsaParcial, idArtiSemana 15: "Banano*" (el asterisco viene de la fuente)',
  },
];
