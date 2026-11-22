import { type PaisPrecioDto } from '@agroprecios/shared';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type * as MapLibre from 'maplibre-gl';
import type { Map as MapaMapLibre } from 'maplibre-gl';

import { formatearPrecio } from '../../../core/formato';
import { COLOR_SIN_DATOS, COLORES_CLASES, calcularClases, claseDe } from './escala';

const COLOR_MAR = '#a9cde0';
const COLOR_SELECCION = '#0b3d5c';
const CENTRO_COLOMBIA: [number, number] = [-73.17, 3.37];

/** Etiqueta flotante que sigue al cursor sobre un país. */
interface Etiqueta {
  x: number;
  y: number;
  nombre: string;
  precio: string | null;
}

type ModuloMapLibre = typeof MapLibre;

/** Worker de MapLibre v6, copiado a public/vendor por scripts/copiar-vendor.mjs. */
export const RUTA_WORKER = 'vendor/maplibre-gl-worker.mjs';

/**
 * Prepara MapLibre a partir del módulo cargado con import() y devuelve la clase Map.
 *
 * - v6 trae el worker en un archivo aparte que busca junto a su propio módulo;
 *   dentro del bundle de Angular esa ruta no existe, así que se indica con
 *   setWorkerUrl la copia servida en /vendor.
 * - Se acepta también el módulo con todo en `default` (forma UMD/CommonJS de
 *   v5 en el build de esbuild, que ya rompió el globo una vez en producción).
 */
export function claseMapa(modulo: ModuloMapLibre, urlWorker?: string): ModuloMapLibre['Map'] {
  const conDefault = modulo as ModuloMapLibre & { default?: ModuloMapLibre };
  const api = typeof conDefault.Map === 'function' ? conDefault : conDefault.default;
  if (typeof api?.Map !== 'function') throw new Error('MapLibre no expone la clase Map');
  if (urlWorker && typeof api.setWorkerUrl === 'function') api.setWorkerUrl(urlWorker);
  return api.Map;
}

async function cargarMapLibre(baseUri: string): Promise<ModuloMapLibre['Map']> {
  return claseMapa(await import('maplibre-gl'), new URL(RUTA_WORKER, baseUri).href);
}

/** true si el navegador puede crear un contexto WebGL (requisito de MapLibre). */
export function soportaWebgl(documento: Document): boolean {
  try {
    const lienzo = documento.createElement('canvas');
    return !!(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Globo terráqueo con MapLibre GL (proyección "globe") y coropleta de precios
 * por país. MapLibre (~200 kB gzip) se descarga con import() solo cuando este
 * componente se dibuja (CLAUDE.md). Sin tiles externos: solo el GeoJSON de
 * Natural Earth sobre un fondo sólido, que funciona sin conexión.
 */
@Component({
  selector: 'ap-globo',
  template: `
    <div #contenedor class="globo" aria-hidden="true"></div>

    @if (etiqueta(); as e) {
      <div class="etiqueta" aria-hidden="true" [style.left.px]="e.x" [style.top.px]="e.y">
        <strong>{{ e.nombre }}</strong>
        <span>{{ e.precio ?? 'Sin datos' }}</span>
      </div>
    }

    <div class="controles" role="group" aria-label="Controles del globo">
      <button type="button" class="control" (click)="acercar()" aria-label="Acercar">+</button>
      <button type="button" class="control" (click)="alejar()" aria-label="Alejar">−</button>
    </div>
    <div class="acciones">
      <button type="button" class="boton centrar" (click)="centrarEnColombia()">
        Centrar en Colombia
      </button>
      <button type="button" class="boton boton--secundario" (click)="verTodo()">
        Ver todo el mundo
      </button>
    </div>
  `,
  styles: `
    /* Alto fijo y mapa en posición absoluta: el lienzo de MapLibre no aporta
       ancho intrínseco y no puede desbordar la página en móvil. */
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: clamp(24rem, 72vh, 46rem);
      overflow: hidden;
      border-radius: inherit;
    }
    .globo {
      position: absolute;
      inset: 0;
      /* "Espacio" oscuro alrededor de la esfera para que resalte el planeta. */
      background: radial-gradient(circle at 50% 45%, #1f4a63 0%, #0f2533 60%, #08161f 100%);
    }
    .etiqueta {
      position: absolute;
      z-index: 2;
      display: grid;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radio-sm);
      background: var(--color-superficie);
      box-shadow: var(--sombra-alta);
      color: var(--color-texto);
      pointer-events: none;
      transform: translate(-50%, calc(-100% - 12px));
      white-space: nowrap;
    }
    .controles {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      display: grid;
      gap: 0.5rem;
    }
    .control {
      width: var(--alto-tactil);
      height: var(--alto-tactil);
      border: 0;
      border-radius: 50%;
      background: var(--color-superficie);
      box-shadow: var(--sombra-alta);
      color: var(--color-texto);
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
    }
    .control:hover {
      background: var(--color-acento-suave);
    }
    .acciones {
      position: absolute;
      left: 0.75rem;
      right: 0.75rem;
      bottom: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .acciones .boton {
      box-shadow: var(--sombra-alta);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Globo {
  /** Precios por país del producto y año elegidos. */
  readonly datos = input.required<PaisPrecioDto[]>();
  readonly seleccionado = input<string | null>(null);

  /** ISO3 y nombre del país tocado. */
  readonly paisTocado = output<{ iso3: string; nombre: string }>();
  /** El equipo no soporta WebGL o MapLibre falló: la página muestra la tabla. */
  readonly sinWebgl = output<void>();

  private readonly documento = inject(DOCUMENT);
  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private mapa: MapaMapLibre | null = null;
  private readonly listo = signal(false);
  protected readonly etiqueta = signal<Etiqueta | null>(null);
  private girando = true;
  private animacion: number | null = null;

  constructor() {
    afterNextRender(() => void this.iniciar());
    inject(DestroyRef).onDestroy(() => {
      if (this.animacion !== null) cancelAnimationFrame(this.animacion);
      this.mapa?.remove();
    });

    // Colorea los países cada vez que cambian los datos o la selección.
    effect(() => {
      const datos = this.datos();
      const seleccionado = this.seleccionado();
      if (this.listo()) this.pintar(datos, seleccionado);
    });
  }

  /** Lleva el globo a Colombia y detiene la rotación. */
  centrarEnColombia(): void {
    this.detenerGiro();
    this.mapa?.flyTo({ center: CENTRO_COLOMBIA, zoom: this.zoomInicial() + 1, essential: true });
  }

  /** Vuelve a mostrar el planeta completo. */
  verTodo(): void {
    this.detenerGiro();
    this.mapa?.flyTo({ zoom: this.zoomInicial(), essential: true });
  }

  acercar(): void {
    this.detenerGiro();
    this.mapa?.zoomIn();
  }

  alejar(): void {
    this.detenerGiro();
    this.mapa?.zoomOut();
  }

  /** Zoom con el que el planeta entero cabe en el contenedor (según su lado más corto). */
  private zoomInicial(): number {
    const { clientWidth, clientHeight } = this.contenedor().nativeElement;
    const lado = Math.min(clientWidth || 400, clientHeight || 400);
    return Math.max(0.6, Math.min(2.2, Math.log2(lado / 400) + 1.3));
  }

  private async iniciar(): Promise<void> {
    if (!soportaWebgl(this.documento)) {
      this.sinWebgl.emit();
      return;
    }
    try {
      this.cargarEstilos();
      const Mapa = await cargarMapLibre(this.documento.baseURI);
      const mapa = new Mapa({
        container: this.contenedor().nativeElement,
        attributionControl: false,
        center: CENTRO_COLOMBIA,
        zoom: this.zoomInicial(),
        style: {
          version: 8,
          projection: { type: 'globe' },
          sources: {
            paises: { type: 'geojson', data: 'geo/paises.geojson', promoteId: 'iso3' },
          },
          layers: [
            { id: 'mar', type: 'background', paint: { 'background-color': COLOR_MAR } },
            {
              id: 'paises-relleno',
              type: 'fill',
              source: 'paises',
              paint: {
                'fill-color': [
                  'match',
                  ['coalesce', ['feature-state', 'clase'], -1],
                  ...COLORES_CLASES.flatMap((color, i) => [i, color]),
                  COLOR_SIN_DATOS,
                ] as never,
              },
            },
            {
              id: 'paises-borde',
              type: 'line',
              source: 'paises',
              paint: {
                'line-color': [
                  'case',
                  ['boolean', ['feature-state', 'seleccionado'], false],
                  COLOR_SELECCION,
                  '#ffffff',
                ],
                'line-width': [
                  'case',
                  ['boolean', ['feature-state', 'seleccionado'], false],
                  3,
                  0.6,
                ],
              },
            },
          ],
        },
      });
      this.mapa = mapa;

      // Un error antes de cargar (WebGL, CSP, GeoJSON) deja el globo inservible: se pasa a la
      // tabla. Después de cargar, un error puntual se registra pero el globo sigue.
      mapa.on('error', (e: { error?: unknown }) => {
        console.error('[globo]', e.error);
        if (!this.listo()) this.sinWebgl.emit();
      });
      mapa.on('load', () => {
        this.listo.set(true);
        this.pintar(this.datos(), this.seleccionado());
        this.iniciarGiro();
      });
      mapa.on('click', 'paises-relleno', (e) => {
        const props = e.features?.[0]?.properties as { iso3?: string; nombre?: string } | undefined;
        if (props?.iso3)
          this.paisTocado.emit({ iso3: props.iso3, nombre: props.nombre ?? props.iso3 });
      });
      mapa.on('mouseenter', 'paises-relleno', () => (mapa.getCanvas().style.cursor = 'pointer'));
      mapa.on('mouseleave', 'paises-relleno', () => {
        mapa.getCanvas().style.cursor = '';
        this.etiqueta.set(null);
      });
      // Etiqueta flotante con el nombre y el precio del país bajo el cursor.
      mapa.on('mousemove', 'paises-relleno', (e) => {
        const props = e.features?.[0]?.properties as { iso3?: string; nombre?: string } | undefined;
        if (!props?.iso3) return;
        const dato = this.datos().find((d) => d.iso3 === props.iso3);
        this.etiqueta.set({
          x: e.point.x,
          y: e.point.y,
          nombre: dato?.nombre ?? props.nombre ?? props.iso3,
          precio: dato ? `${formatearPrecio(dato.valorUsdKg, 'USD', 'kg')} por kilo` : null,
        });
      });
      // La rotación inicial se detiene al primer toque, clic, arrastre o rueda.
      for (const evento of ['mousedown', 'touchstart', 'wheel', 'dragstart'] as const) {
        mapa.on(evento, () => this.detenerGiro());
      }
    } catch (error) {
      console.error('[globo]', error);
      this.sinWebgl.emit();
    }
  }

  private pintar(datos: PaisPrecioDto[], seleccionado: string | null): void {
    const mapa = this.mapa;
    if (!mapa) return;
    mapa.removeFeatureState({ source: 'paises' });
    const limites = calcularClases(datos.map((d) => Number(d.valorUsdKg)));
    for (const d of datos) {
      mapa.setFeatureState(
        { source: 'paises', id: d.iso3 },
        { clase: claseDe(Number(d.valorUsdKg), limites) },
      );
    }
    if (seleccionado)
      mapa.setFeatureState({ source: 'paises', id: seleccionado }, { seleccionado: true });
  }

  private iniciarGiro(): void {
    const reducirMovimiento = this.documento.defaultView?.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducirMovimiento) {
      this.girando = false;
      return;
    }
    const paso = () => {
      if (!this.girando || !this.mapa) return;
      const centro = this.mapa.getCenter();
      this.mapa.setCenter([centro.lng - 0.08, centro.lat]);
      this.animacion = requestAnimationFrame(paso);
    };
    this.animacion = requestAnimationFrame(paso);
  }

  private detenerGiro(): void {
    this.girando = false;
    if (this.animacion !== null) cancelAnimationFrame(this.animacion);
    this.animacion = null;
  }

  /** Hoja de estilos de MapLibre: se copia a /vendor en el build y se carga solo aquí. */
  private cargarEstilos(): void {
    if (this.documento.getElementById('estilos-maplibre')) return;
    const enlace = this.documento.createElement('link');
    enlace.id = 'estilos-maplibre';
    enlace.rel = 'stylesheet';
    enlace.href = 'vendor/maplibre-gl.css';
    this.documento.head.appendChild(enlace);
  }
}
