import { type ComparativoDto, type SerieDisponibleDto } from '@agroprecios/shared';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { API_URL } from '../../core/api';
import {
  etiquetaUnidad,
  formatearFecha,
  formatearPorcentaje,
  formatearPrecio,
} from '../../core/formato';
import { NOTA_MAYORISTA } from '../../core/notas';

/** Productos con precios por mercado mayorista (SIPSA). */
const PRODUCTOS_NACIONALES = [
  { slug: 'platano', nombre: 'Plátano' },
  { slug: 'banano', nombre: 'Banano' },
];

/** Comparativo nacional: un producto en todos los mercados mayoristas (RF-03). */
@Component({
  selector: 'ap-nacional-page',
  templateUrl: './nacional.page.html',
  styleUrl: './nacional.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NacionalPage {
  private readonly api = inject(API_URL);
  private readonly router = inject(Router);

  readonly producto = input<string>();
  readonly presentacion = input<string>();
  readonly fecha = input<string>();

  protected readonly productos = PRODUCTOS_NACIONALES;
  protected readonly notaMayorista = NOTA_MAYORISTA;
  protected readonly productoActual = computed(() => this.producto() ?? 'platano');

  /** Presentaciones con datos por mercado para el producto elegido. */
  protected readonly series = httpResource<SerieDisponibleDto[]>(
    () => `${this.api}/precios/series?producto=${encodeURIComponent(this.productoActual())}`,
  );
  protected readonly presentaciones = computed(() =>
    this.series.hasValue()
      ? [
          ...new Set(
            this.series
              .value()
              .filter((s) => s.mercado)
              .map((s) => s.presentacion),
          ),
        ]
      : [],
  );

  protected readonly comparativo = httpResource<ComparativoDto>(() => {
    const p = new URLSearchParams({ producto: this.productoActual() });
    const presentacion = this.presentacion();
    if (presentacion) p.set('presentacion', presentacion);
    const fecha = this.fecha();
    if (fecha) p.set('fecha', fecha);
    return `${this.api}/precios/comparativo?${p.toString()}`;
  });

  protected readonly datos = computed(() =>
    this.comparativo.hasValue() ? this.comparativo.value() : null,
  );

  protected readonly filas = computed(() => {
    const d = this.datos();
    if (!d) return [];
    return d.items.map((i, posicion) => {
      let diferencia: string | null = null;
      if (!i.esReferencia && i.diferenciaPct !== null && d.referencia) {
        const n = Number(i.diferenciaPct);
        diferencia =
          n === 0
            ? `Igual que ${d.referencia.nombre}`
            : `${formatearPorcentaje(i.diferenciaPct)} ${n > 0 ? 'más' : 'menos'} que ${d.referencia.nombre}`;
      }
      return {
        id: i.mercado.id,
        posicion: posicion + 1,
        nombre: i.mercado.nombre,
        departamento: i.mercado.departamento,
        precio: formatearPrecio(i.valor, d.moneda, d.unidad),
        diferencia,
        tono:
          i.diferenciaPct === null
            ? 'igual'
            : Number(i.diferenciaPct) > 0
              ? 'mas'
              : Number(i.diferenciaPct) < 0
                ? 'menos'
                : 'igual',
        esReferencia: i.esReferencia,
      };
    });
  });

  protected readonly encabezado = computed(() => {
    const d = this.datos();
    if (!d) return null;
    return {
      titulo: `${d.producto.nombre} ${d.presentacion}`,
      fecha: d.fecha ? formatearFecha(d.fecha) : null,
      unidad: etiquetaUnidad(d.unidad),
    };
  });

  protected cambiar(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, replaceUrl: true });
  }
}
