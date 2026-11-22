import { type PrecioHoyItemDto } from '@agroprecios/shared';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  etiquetaUnidad,
  formatearFecha,
  formatearFechaDato,
  formatearMes,
  formatearPorcentaje,
  formatearPrecio,
  tendencia,
} from '../../core/formato';
import { notasDePrecio } from '../../core/notas';
import { IconoProducto } from '../icono-producto/icono-producto';

/** Tarjeta con el precio de referencia de un producto (RF-01). */
@Component({
  selector: 'ap-tarjeta-precio',
  imports: [RouterLink, IconoProducto],
  templateUrl: './tarjeta-precio.html',
  styleUrl: './tarjeta-precio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaPrecio {
  readonly item = input.required<PrecioHoyItemDto>();
  /** Fecha de hoy (AAAA-MM-DD, Bogotá) para resaltar datos que no son del día. */
  readonly hoy = input.required<string>();

  /** "Plátano hartón verde"; sin repetir si la presentación es el mismo producto ("Banano"). */
  protected readonly titulo = computed(() => {
    const { producto, presentacion } = this.item();
    return presentacion.toLowerCase() === producto.nombre.toLowerCase()
      ? producto.nombre
      : `${producto.nombre} ${presentacion}`;
  });
  /** Qué tipo de precio es, en palabras sencillas, según la fuente. */
  protected readonly queEs = computed(() => {
    const { fuente } = this.item();
    switch (fuente.slug) {
      case 'fnc':
        return 'Precio de referencia de la Federación Nacional de Cafeteros';
      case 'sipsa':
        return 'Precio al por mayor en una central de abastos';
      case 'worldbank':
        return 'Precio en el mercado mundial';
      default:
        return `Precio publicado por ${fuente.nombre}`;
    }
  });
  protected readonly precio = computed(() =>
    formatearPrecio(this.item().valor, this.item().moneda, this.item().unidad),
  );
  protected readonly unidad = computed(() => etiquetaUnidad(this.item().unidad));
  /** Datos mensuales (precios internacionales): se muestra el mes, no el día. */
  protected readonly esMensual = computed(() => this.item().periodicidad === 'MENSUAL');
  protected readonly fecha = computed(() =>
    formatearFechaDato(this.item().fecha, this.item().periodicidad),
  );
  protected readonly esDeHoy = computed(() => this.item().fecha === this.hoy());
  /** Equivalente en pesos de un precio en dólares (con la TRM que usó la API). */
  protected readonly equivalentePesos = computed(() => {
    const { moneda, valorCopKg } = this.item();
    if (moneda === 'COP' || !valorCopKg) return null;
    return formatearPrecio(valorCopKg, 'COP', 'kg');
  });
  protected readonly notas = computed(() =>
    notasDePrecio(
      this.item().fuente.slug,
      this.item().producto.slug,
      this.item().complementos.length > 0,
    ),
  );

  /** Parámetros para abrir esta misma serie en Histórico. */
  protected readonly enlaceHistorico = computed(() => {
    const i = this.item();
    return {
      producto: i.producto.slug,
      fuente: i.fuente.slug,
      presentacion: i.presentacion,
      ...(i.mercado ? { mercado: i.mercado.id } : {}),
    };
  });

  protected readonly variacion = computed(() => {
    const v = this.item().variacion;
    if (!v) return null;
    const t = tendencia(v.absoluta);
    const pct = v.porcentaje ? formatearPorcentaje(v.porcentaje) : null;
    // "frente al 12 nov 2026" (diario) o "frente a septiembre de 2026" (mensual)
    const desde = this.esMensual()
      ? `a ${formatearMes(v.fechaAnterior)}`
      : `al ${formatearFecha(v.fechaAnterior)}`;
    const texto =
      t === 'igual'
        ? `Sin cambio frente ${desde}`
        : `${t === 'sube' ? 'Subió' : 'Bajó'}${pct ? ` ${pct}` : ''} frente ${desde}`;
    return { tendencia: t, simbolo: t === 'sube' ? '▲' : t === 'baja' ? '▼' : '=', texto };
  });

  protected readonly complementos = computed(() =>
    this.item().complementos.map((c) => ({
      etiqueta: c.etiqueta,
      precio: formatearPrecio(c.valor, c.moneda, c.unidad),
      unidad: etiquetaUnidad(c.unidad),
      fecha: formatearFechaDato(c.fecha, c.periodicidad),
    })),
  );
}
