import {
  type ProductoDto,
  type SerieDisponibleDto,
  type SeriePrecioDto,
} from '@agroprecios/shared';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { API_URL } from '../../core/api';
import { etiquetaUnidad, formatearFecha, formatearPrecio } from '../../core/formato';
import { notasDePrecio } from '../../core/notas';
import { claveSerie, desdeDeRango, etiquetaSerie, type Rango, RANGOS } from '../../core/series';
import { GraficaLinea, type PuntoGrafica } from '../../shared/grafica-linea/grafica-linea';

/** Histórico de precios: serie, rango, gráfica, tabla y resumen (RF-02). */
@Component({
  selector: 'ap-historico-page',
  imports: [GraficaLinea, RouterLink],
  templateUrl: './historico.page.html',
  styleUrl: './historico.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricoPage {
  private readonly api = inject(API_URL);
  private readonly router = inject(Router);

  // Filtros desde la URL (query params enlazados con withComponentInputBinding).
  readonly producto = input<string>();
  readonly fuente = input<string>();
  readonly presentacion = input<string>();
  readonly mercado = input<string>();
  readonly rango = input<Rango>();

  protected readonly rangos = RANGOS;
  protected readonly productoActual = computed(() => this.producto() ?? 'cafe');
  protected readonly rangoActual = computed<Rango>(() => this.rango() ?? '30d');

  protected readonly productos = httpResource<ProductoDto[]>(() => `${this.api}/productos`);
  protected readonly series = httpResource<SerieDisponibleDto[]>(
    () => `${this.api}/precios/series?producto=${encodeURIComponent(this.productoActual())}`,
  );

  /** Serie elegida: la de la URL o, si no hay, la primera disponible. */
  protected readonly serieElegida = computed<SerieDisponibleDto | null>(() => {
    if (!this.series.hasValue()) return null;
    const lista = this.series.value();
    const pedida = `${this.fuente() ?? ''}|${this.mercado() ?? ''}|${this.presentacion() ?? ''}`;
    return lista.find((s) => claveSerie(s) === pedida) ?? lista[0] ?? null;
  });

  protected readonly datos = httpResource<SeriePrecioDto>(() => {
    const s = this.serieElegida();
    if (!s) return undefined;
    const p = new URLSearchParams({
      producto: this.productoActual(),
      fuente: s.fuente.slug,
      presentacion: s.presentacion,
      desde: desdeDeRango(this.rangoActual(), s.hasta, s.desde),
      hasta: s.hasta,
    });
    if (s.mercado) p.set('mercado', String(s.mercado.id));
    return `${this.api}/precios/serie?${p.toString()}`;
  });

  protected readonly serie = computed(() => (this.datos.hasValue() ? this.datos.value() : null));

  protected readonly formatear = computed(() => {
    const s = this.serie();
    return (valor: number) =>
      s ? formatearPrecio(String(valor), s.moneda, s.unidad) : String(valor);
  });

  protected readonly puntos = computed<PuntoGrafica[]>(() =>
    (this.serie()?.items ?? []).map((p) => ({
      etiqueta: formatearFecha(p.fecha),
      valor: Number(p.valor),
    })),
  );

  /** Tabla: más reciente primero. */
  protected readonly filas = computed(() =>
    [...(this.serie()?.items ?? [])].reverse().map((p) => ({
      fecha: p.fecha,
      fechaTexto: formatearFecha(p.fecha),
      precio: this.formatear()(Number(p.valor)),
    })),
  );

  protected readonly resumen = computed(() => {
    const s = this.serie();
    if (!s?.resumen) return null;
    const f = (v: string) => formatearPrecio(v, s.moneda, s.unidad);
    return {
      minimo: f(s.resumen.minimo),
      maximo: f(s.resumen.maximo),
      promedio: f(s.resumen.promedio),
      cantidad: s.resumen.cantidad,
      unidad: etiquetaUnidad(s.unidad),
      desde: formatearFecha(s.desde),
      hasta: formatearFecha(s.hasta),
    };
  });

  protected readonly notas = computed(() => {
    const s = this.serie();
    return s ? notasDePrecio(s.fuente.slug, s.producto.slug, false) : [];
  });

  protected readonly claveElegida = computed(() => {
    const s = this.serieElegida();
    return s ? claveSerie(s) : '';
  });
  protected readonly etiquetaSerie = etiquetaSerie;
  protected readonly claveSerie = claveSerie;

  protected cambiarProducto(producto: string): void {
    void this.router.navigate([], { queryParams: { producto }, replaceUrl: true });
  }

  protected cambiarSerie(clave: string): void {
    const [fuente, mercado, presentacion] = clave.split('|');
    void this.router.navigate([], {
      queryParams: { fuente, mercado: mercado || null, presentacion },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected cambiarRango(rango: Rango): void {
    void this.router.navigate([], {
      queryParams: { rango },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
