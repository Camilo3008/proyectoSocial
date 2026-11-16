import { type PrecioHoyItemDto } from '@agroprecios/shared';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  etiquetaUnidad,
  formatearFecha,
  formatearPorcentaje,
  formatearPrecio,
  tendencia,
} from '../../core/formato';
import { notasDePrecio } from '../../core/notas';

/** Tarjeta con el precio de referencia de un producto (RF-01). */
@Component({
  selector: 'ap-tarjeta-precio',
  imports: [RouterLink],
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
  protected readonly precio = computed(() =>
    formatearPrecio(this.item().valor, this.item().moneda, this.item().unidad),
  );
  protected readonly unidad = computed(() => etiquetaUnidad(this.item().unidad));
  protected readonly fecha = computed(() => formatearFecha(this.item().fecha));
  protected readonly esDeHoy = computed(() => this.item().fecha === this.hoy());
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
    const desde = formatearFecha(v.fechaAnterior);
    const texto =
      t === 'igual'
        ? `Sin cambio frente al ${desde}`
        : `${t === 'sube' ? 'Subió' : 'Bajó'}${pct ? ` ${pct}` : ''} frente al ${desde}`;
    return { tendencia: t, simbolo: t === 'sube' ? '▲' : t === 'baja' ? '▼' : '=', texto };
  });

  protected readonly complementos = computed(() =>
    this.item().complementos.map((c) => ({
      etiqueta: c.etiqueta,
      precio: formatearPrecio(c.valor, c.moneda, c.unidad),
      unidad: etiquetaUnidad(c.unidad),
      fecha: formatearFecha(c.fecha),
    })),
  );
}
