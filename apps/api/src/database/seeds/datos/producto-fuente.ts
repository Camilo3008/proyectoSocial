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
  // Banco Mundial (docs/fuentes/worldbank.md): el código es el encabezado exacto de la columna.
  {
    producto: 'cafe',
    fuente: 'worldbank',
    codigoExterno: 'Coffee, Arabica',
    presentacion: 'verde arábica (indicador ICO)',
    notas:
      'ICO indicator price, other mild Arabicas, average New York and Bremen/Hamburg markets, ex-dock',
  },
  {
    producto: 'cafe',
    fuente: 'worldbank',
    codigoExterno: 'Coffee, Robusta',
    presentacion: 'verde robusta (indicador ICO)',
    notas:
      'ICO indicator price, Robustas, average New York and Le Havre/Marseilles markets, ex-dock',
  },
  {
    producto: 'cacao',
    fuente: 'worldbank',
    codigoExterno: 'Cocoa',
    presentacion: 'en grano (ICCO)',
    notas:
      'ICCO daily price, average of the first three positions on the terminal markets of New York and London',
  },
  {
    producto: 'banano',
    fuente: 'worldbank',
    codigoExterno: 'Banana, US',
    presentacion: 'importación EE. UU.',
    notas: 'Bananas (Central & South America), major brands, US import price, f.o.t. US Gulf ports',
  },
  {
    producto: 'banano',
    fuente: 'worldbank',
    codigoExterno: 'Banana, Europe',
    presentacion: 'importación Europa',
    notas:
      'Bananas (Central & South America), major brands, f.o.t. Southern Europe, including duties',
  },
  // FAOSTAT Producer Prices (docs/fuentes/faostat.md): código = Item Code.
  {
    producto: 'cafe',
    fuente: 'faostat',
    codigoExterno: '656',
    presentacion: 'verde, precio al productor',
    notas: 'FAOSTAT PP, Item Code 656: "Coffee, green"',
  },
  {
    producto: 'cacao',
    fuente: 'faostat',
    codigoExterno: '661',
    presentacion: 'en grano, precio al productor',
    notas: 'FAOSTAT PP, Item Code 661: "Cocoa beans"',
  },
  {
    producto: 'banano',
    fuente: 'faostat',
    codigoExterno: '486',
    presentacion: 'precio al productor',
    notas: 'FAOSTAT PP, Item Code 486: "Bananas"',
  },
  {
    producto: 'platano',
    fuente: 'faostat',
    codigoExterno: '487',
    presentacion: 'precio al productor',
    notas: 'FAOSTAT PP, Item Code 487: "Plantains" (no se usa 489, agregado con poca cobertura)',
  },
];
