import { strFromU8, unzipSync } from 'fflate';
import { SaxesParser } from 'saxes';

/** Fila de una hoja: número de fila (1..n) y celdas por letra de columna. */
export interface FilaXlsx {
  numero: number;
  celdas: Map<string, string>;
}

const RUTA_LIBRO = 'xl/workbook.xml';
const RUTA_RELACIONES = 'xl/_rels/workbook.xml.rels';
const RUTA_CADENAS = 'xl/sharedStrings.xml';

function parsear(xml: string, manejar: (parser: SaxesParser<{ xmlns: false }>) => void): void {
  const parser = new SaxesParser({ xmlns: false });
  manejar(parser);
  parser.write(xml).close();
}

/** Cadenas compartidas del libro (las celdas de texto guardan solo su índice). */
function leerCadenas(xml: string | undefined): string[] {
  if (!xml) return [];
  const cadenas: string[] = [];
  let actual: string | null = null;
  let enTexto = false;
  parsear(xml, (p) => {
    p.on('opentag', (n) => {
      if (n.name === 'si') actual = '';
      else if (n.name === 't') enTexto = true;
    });
    p.on('text', (t) => {
      if (enTexto && actual !== null) actual += t;
    });
    p.on('closetag', (n) => {
      if (n.name === 't') enTexto = false;
      else if (n.name === 'si') {
        cadenas.push(actual ?? '');
        actual = null;
      }
    });
  });
  return cadenas;
}

/** Ruta interna (dentro del ZIP) de la hoja con ese nombre. */
function rutaDeHoja(archivos: Record<string, Uint8Array>, nombreHoja: string): string {
  const libro = archivos[RUTA_LIBRO];
  const relaciones = archivos[RUTA_RELACIONES];
  if (!libro || !relaciones) throw new Error('El archivo no es un libro XLSX válido');

  let idRelacion: string | null = null;
  parsear(strFromU8(libro), (p) =>
    p.on('opentag', (n) => {
      if (n.name === 'sheet' && n.attributes['name'] === nombreHoja) {
        idRelacion = n.attributes['r:id'] ?? null;
      }
    }),
  );
  if (!idRelacion) throw new Error(`El libro no tiene la hoja "${nombreHoja}"`);

  let destino: string | null = null;
  parsear(strFromU8(relaciones), (p) =>
    p.on('opentag', (n) => {
      if (n.name === 'Relationship' && n.attributes['Id'] === idRelacion) {
        destino = n.attributes['Target'] ?? null;
      }
    }),
  );
  if (!destino) throw new Error(`No se encontró el archivo de la hoja "${nombreHoja}"`);
  const ruta = (destino as string).replace(/^\/?xl\//, '').replace(/^\//, '');
  return `xl/${ruta}`;
}

/**
 * Lee una hoja de un XLSX (bytes) y devuelve sus filas con los valores como
 * texto: las cadenas compartidas se resuelven y los números quedan tal como
 * están en el archivo (p. ej. "1.0900000000000001"), sin convertirlos a number.
 */
export function leerHojaXlsx(bytes: Uint8Array, nombreHoja: string): FilaXlsx[] {
  let archivos: Record<string, Uint8Array>;
  try {
    archivos = unzipSync(bytes, {
      // Solo se descomprime lo necesario.
      filter: (f) => f.name.startsWith('xl/') && !f.name.startsWith('xl/media/'),
    });
  } catch {
    throw new Error('El archivo descargado no es un XLSX (ZIP) válido');
  }
  const ruta = rutaDeHoja(archivos, nombreHoja);
  const hoja = archivos[ruta];
  if (!hoja) throw new Error(`Falta el archivo interno ${ruta}`);
  const cadenas = leerCadenas(
    archivos[RUTA_CADENAS] ? strFromU8(archivos[RUTA_CADENAS]) : undefined,
  );

  const filas: FilaXlsx[] = [];
  let fila: FilaXlsx | null = null;
  let celda: { columna: string; tipo: string | undefined } | null = null;
  let valor = '';
  let enValor = false;

  parsear(strFromU8(hoja), (p) => {
    p.on('opentag', (n) => {
      if (n.name === 'row') {
        fila = { numero: Number(n.attributes['r']), celdas: new Map() };
      } else if (n.name === 'c' && fila) {
        const referencia = n.attributes['r'] ?? '';
        celda = { columna: referencia.replace(/\d+$/, ''), tipo: n.attributes['t'] };
        valor = '';
      } else if ((n.name === 'v' || n.name === 't') && celda) {
        enValor = true;
      }
    });
    p.on('text', (t) => {
      if (enValor) valor += t;
    });
    p.on('closetag', (n) => {
      if (n.name === 'v' || n.name === 't') {
        enValor = false;
      } else if (n.name === 'c' && celda && fila) {
        if (valor !== '') {
          const texto = celda.tipo === 's' ? (cadenas[Number(valor)] ?? '') : valor;
          fila.celdas.set(celda.columna, texto);
        }
        celda = null;
      } else if (n.name === 'row' && fila) {
        filas.push(fila);
        fila = null;
      }
    });
  });
  return filas;
}
