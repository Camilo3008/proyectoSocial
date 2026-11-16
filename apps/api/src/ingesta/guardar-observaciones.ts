import { type EntityManager } from 'typeorm';
import { ProductoFuente } from '../catalogo/entities/producto-fuente.entity.js';
import { sumarDias } from '../common/fechas.js';
import { calcularDerivados } from '../common/unidades.js';
import { type ObservacionPrecioCruda } from './adapters/fuente-adapter.interface.js';

export interface ConteoObservaciones {
  insertados: number;
  actualizados: number;
  mercadosNuevos: number;
  advertencias: string[];
}

/** Parámetros por fila en el INSERT de observaciones. */
const COLUMNAS_OBS = 14;
const LOTE_OBS = 400; // 400 * 14 = 5600 parámetros (límite de PostgreSQL: 65535)

/** Mapa código externo -> producto y presentación, para una fuente. */
export async function cargarMapeo(
  em: EntityManager,
  fuenteId: number,
): Promise<Map<string, { productoId: number; presentacion: string | null }>> {
  const filas = await em.find(ProductoFuente, { where: { fuenteId } });
  return new Map(
    filas.map((f) => [f.codigoExterno, { productoId: f.productoId, presentacion: f.presentacion }]),
  );
}

/**
 * Crea o actualiza los mercados por (fuente_id, codigo_externo), nunca por el
 * nombre. Nombre, municipio y departamento se guardan tal como vienen de la
 * fuente; lo que la fuente no trae queda en NULL. Devuelve código -> id y
 * cuántos mercados son nuevos.
 */
async function upsertMercados(
  em: EntityManager,
  fuenteId: number,
  observaciones: ObservacionPrecioCruda[],
): Promise<{ ids: Map<string, number>; nuevos: number }> {
  const porCodigo = new Map<string, NonNullable<ObservacionPrecioCruda['mercado']>>();
  for (const o of observaciones) {
    if (o.mercado) porCodigo.set(o.mercado.codigoExterno, o.mercado);
  }
  const ids = new Map<string, number>();
  let nuevos = 0;
  for (const m of porCodigo.values()) {
    const [fila] = await em.query<{ id: number; insertado: boolean }[]>(
      `INSERT INTO mercado (fuente_id, codigo_externo, nombre, tipo, municipio, departamento, pais_iso3)
       VALUES ($1, $2, $3, $4, $5, $6, 'COL')
       ON CONFLICT (fuente_id, codigo_externo) WHERE codigo_externo IS NOT NULL DO UPDATE
         SET nombre = EXCLUDED.nombre, municipio = EXCLUDED.municipio,
             departamento = EXCLUDED.departamento, tipo = EXCLUDED.tipo
       RETURNING id, (xmax = 0) AS insertado`,
      [fuenteId, m.codigoExterno, m.nombre, m.tipo, m.municipio ?? null, m.departamento ?? null],
    );
    ids.set(m.codigoExterno, fila!.id);
    if (fila!.insertado) nuevos++;
  }
  return { ids, nuevos };
}

/** TRM (COP por USD) vigente para cada fecha pedida: la del día o la hábil anterior. */
async function trmPorFecha(em: EntityManager, fechas: string[]): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  if (fechas.length === 0) return resultado;
  const ordenadas = [...new Set(fechas)].sort();
  const tasas = await em.query<{ fecha: string; valor: string }[]>(
    `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, valor::text AS valor FROM tasa_cambio
     WHERE moneda_origen = 'USD' AND moneda_destino = 'COP' AND fecha BETWEEN $1 AND $2
     ORDER BY fecha`,
    [sumarDias(ordenadas[0]!, -15), ordenadas.at(-1)],
  );
  let i = -1;
  for (const fecha of ordenadas) {
    while (i + 1 < tasas.length && tasas[i + 1]!.fecha <= fecha) i++;
    if (i >= 0) resultado.set(fecha, tasas[i]!.valor);
  }
  return resultado;
}

/**
 * Normaliza y guarda observaciones de una ingesta con upsert idempotente sobre
 * uq_observacion_precio_clave. No toca observaciones anuladas por el
 * administrador y solo actualiza si algo cambió. Debe correr dentro de la
 * transacción de la ejecución.
 */
export async function guardarObservaciones(
  em: EntityManager,
  fuenteId: number,
  ingestaId: number,
  observaciones: ObservacionPrecioCruda[],
): Promise<ConteoObservaciones> {
  const conteo: ConteoObservaciones = {
    insertados: 0,
    actualizados: 0,
    mercadosNuevos: 0,
    advertencias: [],
  };
  if (observaciones.length === 0) return conteo;

  const mapeo = await cargarMapeo(em, fuenteId);
  const { ids: idMercado, nuevos } = await upsertMercados(em, fuenteId, observaciones);
  conteo.mercadosNuevos = nuevos;
  const trm = await trmPorFecha(
    em,
    observaciones.map((o) => o.fecha),
  );

  const sinMapeo = new Set<string>();
  const filas: unknown[][] = [];
  for (const o of observaciones) {
    const destino = mapeo.get(o.codigoExterno);
    if (!destino) {
      sinMapeo.add(o.codigoExterno);
      continue;
    }
    const derivados = calcularDerivados(o.valor, o.moneda, o.unidad, trm.get(o.fecha) ?? null);
    filas.push([
      destino.productoId,
      fuenteId,
      o.mercado ? idMercado.get(o.mercado.codigoExterno) : null,
      o.paisIso3 ?? null,
      o.fecha,
      o.periodicidad,
      destino.presentacion ?? o.presentacion,
      o.valor,
      o.moneda,
      o.unidad,
      derivados.valorCopKg,
      derivados.valorUsdKg,
      JSON.stringify(o.metadata ?? null),
      ingestaId,
    ]);
  }
  if (sinMapeo.size > 0) {
    conteo.advertencias.push(`Códigos sin mapeo en producto_fuente: ${[...sinMapeo].join(', ')}`);
  }

  for (let i = 0; i < filas.length; i += LOTE_OBS) {
    const lote = filas.slice(i, i + LOTE_OBS);
    const parametros = lote.flat();
    const valores = lote.map((_, j) => {
      const b = j * COLUMNAS_OBS;
      const p = (k: number) => `$${b + k}`;
      return (
        `(${p(1)}::int, ${p(2)}::int, ${p(3)}::int, ${p(4)}::char(3), ${p(5)}::date, ` +
        `${p(6)}::frecuencia, ${p(7)}, ${p(8)}::numeric, ${p(9)}::char(3), ${p(10)}, ` +
        `${p(11)}::numeric, ${p(12)}::numeric, ${p(13)}::jsonb, ${p(14)}::int)`
      );
    });
    const resultado = await em.query<{ insertado: boolean }[]>(
      `INSERT INTO observacion_precio (producto_id, fuente_id, mercado_id, pais_iso3, fecha,
         periodicidad, presentacion, valor, moneda, unidad, valor_cop_kg, valor_usd_kg,
         metadata, ingesta_id)
       VALUES ${valores.join(', ')}
       ON CONFLICT (producto_id, fuente_id, COALESCE(mercado_id, 0), COALESCE(pais_iso3, ''),
                    fecha, periodicidad, presentacion) DO UPDATE
         SET valor = EXCLUDED.valor, moneda = EXCLUDED.moneda, unidad = EXCLUDED.unidad,
             valor_cop_kg = EXCLUDED.valor_cop_kg, valor_usd_kg = EXCLUDED.valor_usd_kg,
             metadata = EXCLUDED.metadata, ingesta_id = EXCLUDED.ingesta_id,
             actualizado_en = now()
         WHERE observacion_precio.anulado = false
           AND (observacion_precio.valor IS DISTINCT FROM EXCLUDED.valor
             OR observacion_precio.unidad IS DISTINCT FROM EXCLUDED.unidad
             OR observacion_precio.moneda IS DISTINCT FROM EXCLUDED.moneda
             OR observacion_precio.valor_usd_kg IS DISTINCT FROM EXCLUDED.valor_usd_kg
             OR observacion_precio.metadata IS DISTINCT FROM EXCLUDED.metadata)
       RETURNING (xmax = 0) AS insertado`,
      parametros,
    );
    for (const fila of resultado) {
      if (fila.insertado) conteo.insertados++;
      else conteo.actualizados++;
    }
  }
  return conteo;
}
