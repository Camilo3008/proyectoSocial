import { type PrecioHoyItemDto } from '@agroprecios/shared';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  etiquetaUnidad,
  formatearFecha,
  formatearPorcentaje,
  formatearPrecio,
  tendencia,
} from '../../core/formato';

/** Advertencias de comparabilidad por producto (docs/PROYECTO.md §7.1). */
const NOTAS: Record<string, string> = {
  cafe: 'Nueva York cotiza café verde (excelso), no pergamino: los dos precios no se comparan directamente.',
};

/** Tarjeta con el precio de referencia de un producto (RF-01). */
@Component({
  selector: 'ap-tarjeta-precio',
  templateUrl: './tarjeta-precio.html',
  styleUrl: './tarjeta-precio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaPrecio {
  readonly item = input.required<PrecioHoyItemDto>();
  /** Fecha de hoy (AAAA-MM-DD, Bogotá) para resaltar datos que no son del día. */
  readonly hoy = input.required<string>();

  protected readonly titulo = computed(
    () => `${this.item().producto.nombre} ${this.item().presentacion}`,
  );
  protected readonly precio = computed(() =>
    formatearPrecio(this.item().valor, this.item().moneda, this.item().unidad),
  );
  protected readonly unidad = computed(() => etiquetaUnidad(this.item().unidad));
  protected readonly fecha = computed(() => formatearFecha(this.item().fecha));
  protected readonly esDeHoy = computed(() => this.item().fecha === this.hoy());
  protected readonly nota = computed(() =>
    this.item().complementos.length > 0 ? (NOTAS[this.item().producto.slug] ?? null) : null,
  );

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
