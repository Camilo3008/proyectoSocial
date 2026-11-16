import { type CommoditiesDto } from '@agroprecios/shared';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { API_URL } from '../../core/api';
import {
  formatearMes,
  formatearMesCorto,
  formatearPorcentaje,
  formatearPrecio,
  tendencia,
} from '../../core/formato';
import { NOTA_INTERNACIONAL, NOTAS_COMPARACION } from '../../core/notas';
import { GraficaLinea, type SerieGrafica } from '../../shared/grafica-linea/grafica-linea';

type Moneda = 'COP' | 'USD';
type RangoAnios = '2a' | '5a' | '10a' | 'todo';

const PRODUCTOS = [
  { slug: 'cafe', nombre: 'Café' },
  { slug: 'cacao', nombre: 'Cacao' },
  { slug: 'banano', nombre: 'Banano' },
];

const RANGOS: { valor: RangoAnios; etiqueta: string; anios: number | null }[] = [
  { valor: '2a', etiqueta: '2 años', anios: 2 },
  { valor: '5a', etiqueta: '5 años', anios: 5 },
  { valor: '10a', etiqueta: '10 años', anios: 10 },
  { valor: 'todo', etiqueta: 'Desde 1960', anios: null },
];

/** Primer día del mes, `anios` años antes de hoy. */
function desdeHaceAnios(anios: number | null): string {
  if (anios === null) return '1960-01-01';
  const d = new Date();
  return `${d.getUTCFullYear() - anios}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Pantalla "Mundo": precios internacionales mensuales (Banco Mundial) frente al
 * precio nacional (RF-04). El globo terráqueo (RF-05) llega en la Etapa 4 y se
 * cargará con import() dinámico solo en esta ruta.
 */
@Component({
  selector: 'ap-internacional-page',
  imports: [GraficaLinea],
  templateUrl: './internacional.page.html',
  styleUrl: './internacional.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternacionalPage {
  private readonly api = inject(API_URL);
  private readonly router = inject(Router);

  // Filtros desde la URL (query params).
  readonly producto = input<string>();
  readonly moneda = input<Moneda>();
  readonly rango = input<RangoAnios>();

  protected readonly productos = PRODUCTOS;
  protected readonly rangos = RANGOS;
  protected readonly notaInternacional = NOTA_INTERNACIONAL;
  protected readonly productoActual = computed(() => this.producto() ?? 'cafe');
  protected readonly monedaActual = computed<Moneda>(() => this.moneda() ?? 'COP');
  protected readonly rangoActual = computed<RangoAnios>(() => this.rango() ?? '2a');

  protected readonly datos = httpResource<CommoditiesDto>(() => {
    const anios = RANGOS.find((r) => r.valor === this.rangoActual())?.anios ?? 2;
    const p = new URLSearchParams({
      producto: this.productoActual(),
      desde: desdeHaceAnios(anios),
    });
    return `${this.api}/internacional/commodities?${p.toString()}`;
  });

  protected readonly respuesta = computed(() =>
    this.datos.hasValue() ? this.datos.value() : null,
  );
  protected readonly notaComparacion = computed(
    () => NOTAS_COMPARACION[this.productoActual()] ?? null,
  );

  /** Meses del eje X: todos los meses con datos internacionales, en orden. */
  private readonly meses = computed(() => {
    const r = this.respuesta();
    if (!r) return [];
    return [...new Set(r.series.flatMap((s) => s.items.map((i) => i.fecha)))].sort();
  });

  protected readonly etiquetas = computed(() => this.meses().map(formatearMesCorto));

  /** Una línea por serie internacional; en pesos se agrega la referencia nacional. */
  protected readonly lineas = computed<SerieGrafica[]>(() => {
    const r = this.respuesta();
    if (!r) return [];
    const usd = this.monedaActual() === 'USD';
    const lineas = r.series.map((s) => {
      const porMes = new Map(s.items.map((i) => [i.fecha, usd ? i.valorUsdKg : i.valorCopKg]));
      return {
        nombre: `Internacional: ${s.presentacion}`,
        valores: this.meses().map((m) => {
          const v = porMes.get(m);
          return v ? Number(v) : null;
        }),
      };
    });
    if (!usd && r.nacional) {
      const porMes = new Map(r.nacional.items.map((i) => [i.fecha, i.valorCopKg]));
      lineas.push({
        nombre: `Colombia: ${r.nacional.presentacion}${r.nacional.mercado ? ` (${r.nacional.mercado})` : ''}`,
        valores: this.meses().map((m) => {
          const v = porMes.get(m);
          return v ? Number(v) : null;
        }),
      });
    }
    return lineas;
  });

  protected readonly formatear = computed(() =>
    this.monedaActual() === 'USD'
      ? (v: number) => formatearPrecio(String(v), 'USD', 'kg')
      : (v: number) => formatearPrecio(String(v), 'COP', 'kg'),
  );

  /** Último mes de cada serie, con su variación frente al mes anterior. */
  protected readonly resumen = computed(() => {
    const r = this.respuesta();
    if (!r) return [];
    return r.series
      .filter((s) => s.items.length > 0)
      .map((s) => {
        const ultimo = s.items.at(-1)!;
        const anterior = s.items.at(-2);
        let variacion: { texto: string; tendencia: string } | null = null;
        if (anterior && Number(anterior.valorUsdKg) > 0) {
          const pct =
            ((Number(ultimo.valorUsdKg) - Number(anterior.valorUsdKg)) /
              Number(anterior.valorUsdKg)) *
            100;
          const t = tendencia(String(pct));
          variacion = {
            tendencia: t,
            texto:
              t === 'igual'
                ? `Sin cambio frente a ${formatearMes(anterior.fecha)}`
                : `${t === 'sube' ? '▲ Subió' : '▼ Bajó'} ${formatearPorcentaje(pct.toFixed(2))} frente a ${formatearMes(anterior.fecha)}`,
          };
        }
        return {
          presentacion: s.presentacion,
          mes: formatearMes(ultimo.fecha),
          usd: formatearPrecio(ultimo.valorUsdKg, 'USD', 'kg'),
          cop: ultimo.valorCopKg ? formatearPrecio(ultimo.valorCopKg, 'COP', 'kg') : null,
          variacion,
        };
      });
  });

  /** Tabla accesible: últimos 12 meses, más reciente primero. */
  protected readonly tabla = computed(() => {
    const r = this.respuesta();
    if (!r)
      return {
        columnas: [] as string[],
        filas: [] as { mes: string; fecha: string; valores: string[] }[],
      };
    const usd = this.monedaActual() === 'USD';
    const columnas = r.series.map((s) => s.presentacion);
    const indices = r.series.map(
      (s) => new Map(s.items.map((i) => [i.fecha, usd ? i.valorUsdKg : i.valorCopKg])),
    );
    if (!usd && r.nacional) {
      columnas.push(`Colombia: ${r.nacional.presentacion}`);
      indices.push(new Map(r.nacional.items.map((i) => [i.fecha, i.valorCopKg])));
    }
    const filas = [...this.meses()]
      .reverse()
      .slice(0, 12)
      .map((fecha) => ({
        fecha,
        mes: formatearMes(fecha),
        valores: indices.map((indice) => {
          const v = indice.get(fecha);
          return v ? this.formatear()(Number(v)) : '—';
        }),
      }));
    return { columnas, filas };
  });

  protected cambiar(params: Record<string, string>): void {
    void this.router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
