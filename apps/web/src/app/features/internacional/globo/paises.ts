import { type DetallePaisDto, type MapaPaisesDto } from '@agroprecios/shared';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { API_URL } from '../../../core/api';
import { formatearNumero, formatearPorcentaje, formatearPrecio } from '../../../core/formato';
import { COLOR_SIN_DATOS, COLORES_CLASES, calcularClases } from './escala';
import { Globo } from './globo';

export const PRODUCTOS_PAISES = [
  { slug: 'cafe', nombre: 'Café' },
  { slug: 'cacao', nombre: 'Cacao' },
  { slug: 'banano', nombre: 'Banano' },
  { slug: 'platano', nombre: 'Plátano' },
];

/** "CO" -> "🇨🇴" (indicadores regionales Unicode). */
export function bandera(iso2: string | null): string {
  if (!iso2 || !/^[A-Z]{2}$/.test(iso2)) return '';
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const usdKg = (v: string) => formatearPrecio(v, 'USD', 'kg');
const copKg = (v: string) => formatearPrecio(v, 'COP', 'kg');

/**
 * Precio al productor por país (FAOSTAT, RF-05): globo con coropleta o, si el
 * equipo no tiene WebGL o el usuario lo prefiere, una tabla con los mismos datos.
 */
@Component({
  selector: 'ap-paises',
  imports: [Globo],
  templateUrl: './paises.html',
  styleUrl: './paises.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paises {
  private readonly api = inject(API_URL);

  /** Query param `productoPais` (distinto de `producto`, que usa la sección de bolsa). */
  readonly producto = input<string>();
  readonly anio = input<string>();
  readonly vista = input<string>();
  readonly pais = input<string>();
  /** Cambios de filtros para reflejarlos en la URL. */
  readonly cambio = output<Record<string, string | null>>();

  protected readonly productos = PRODUCTOS_PAISES;
  protected readonly colores = COLORES_CLASES;
  protected readonly colorSinDatos = COLOR_SIN_DATOS;
  protected readonly productoActual = computed(() => this.producto() ?? 'cafe');
  /** Sin WebGL se fuerza la tabla, aunque la URL pida el globo. */
  protected readonly sinWebgl = signal(false);
  protected readonly enTabla = computed(() => this.sinWebgl() || this.vista() === 'tabla');
  protected readonly bandera = bandera;
  protected readonly usdKg = usdKg;
  protected readonly copKg = copKg;
  protected readonly numero = formatearNumero;

  protected readonly mapa = httpResource<MapaPaisesDto>(() => {
    const p = new URLSearchParams({ producto: this.productoActual() });
    const anio = this.anio();
    if (anio && /^\d{4}$/.test(anio)) p.set('anio', anio);
    return `${this.api}/internacional/paises?${p.toString()}`;
  });

  protected readonly datosMapa = computed(() => (this.mapa.hasValue() ? this.mapa.value() : null));
  protected readonly items = computed(() => this.datosMapa()?.items ?? []);

  /** Rangos de la leyenda en USD/kg, de menor a mayor. */
  protected readonly leyenda = computed(() => {
    const valores = this.items().map((i) => Number(i.valorUsdKg));
    if (valores.length === 0) return [];
    const limites = calcularClases(valores);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const cortes = [min, ...limites, max];
    return COLORES_CLASES.map((color, i) => ({
      color,
      texto: `${usdKg(String(cortes[i]))} – ${usdKg(String(cortes[i + 1]))}`,
    }));
  });

  protected readonly detalle = httpResource<DetallePaisDto>(() => {
    const iso3 = this.pais();
    if (!iso3 || !/^[A-Z]{3}$/.test(iso3)) return undefined;
    return `${this.api}/internacional/paises/${iso3}?producto=${this.productoActual()}`;
  });

  protected readonly ficha = computed(() => {
    if (!this.pais() || !this.detalle.hasValue()) return null;
    const d = this.detalle.value();
    const c = d.comparacionColombia;
    let comparacion: string | null = null;
    if (c?.diferenciaPct) {
      const pct = Number(c.diferenciaPct);
      comparacion =
        pct === 0
          ? `Igual que en Colombia en ${c.anio}`
          : `${formatearPorcentaje(c.diferenciaPct)} ${pct > 0 ? 'más' : 'menos'} que en Colombia (${usdKg(c.valorColombiaUsdKg)}) en ${c.anio}`;
    }
    const serie = d.serie.slice(-6);
    const maximo = Math.max(...serie.map((s) => Number(s.valorUsdKg)), 0);
    return {
      ...d,
      comparacion,
      barras: serie.map((s) => ({
        anio: s.anio,
        texto: usdKg(s.valorUsdKg),
        alto: maximo > 0 ? Math.max(4, Math.round((Number(s.valorUsdKg) / maximo) * 100)) : 0,
      })),
    };
  });

  protected elegirPais(iso3: string): void {
    this.cambio.emit({ pais: iso3 });
  }

  protected cerrarFicha(): void {
    this.cambio.emit({ pais: null });
  }

  protected cambiar(params: Record<string, string | null>): void {
    this.cambio.emit(params);
  }
}
