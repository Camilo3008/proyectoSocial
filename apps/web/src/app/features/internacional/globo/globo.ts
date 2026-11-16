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
import type { Map as MapaMapLibre } from 'maplibre-gl';

import { COLOR_SIN_DATOS, COLORES_CLASES, calcularClases, claseDe } from './escala';

const COLOR_MAR = '#dfe9f0';
const CENTRO_COLOMBIA: [number, number] = [-73.17, 3.37];

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
    <button type="button" class="boton centrar" (click)="centrarEnColombia()">
      Centrar en Colombia
    </button>
  `,
  styles: `
    /* Alto fijo y mapa en posición absoluta: el lienzo de MapLibre no aporta
       ancho intrínseco y no puede desbordar la página en móvil. */
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: min(70vh, 26rem);
      overflow: hidden;
      border-radius: var(--radio);
    }
    .centrar {
      position: absolute;
      right: 0.75rem;
      bottom: 0.75rem;
      box-shadow: var(--sombra);
    }
    .globo {
      position: absolute;
      inset: 0;
      background: ${COLOR_MAR};
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
    this.mapa?.flyTo({ center: CENTRO_COLOMBIA, zoom: 2.2, essential: true });
  }

  private async iniciar(): Promise<void> {
    if (!soportaWebgl(this.documento)) {
      this.sinWebgl.emit();
      return;
    }
    try {
      this.cargarEstilos();
      const { Map: Mapa } = await import('maplibre-gl');
      const mapa = new Mapa({
        container: this.contenedor().nativeElement,
        attributionControl: false,
        center: CENTRO_COLOMBIA,
        zoom: 1.3,
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
                  '#d1495b',
                  '#ffffff',
                ],
                'line-width': [
                  'case',
                  ['boolean', ['feature-state', 'seleccionado'], false],
                  2.5,
                  0.5,
                ],
              },
            },
          ],
        },
      });
      this.mapa = mapa;

      mapa.on('error', () => this.sinWebgl.emit());
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
      mapa.on('mouseleave', 'paises-relleno', () => (mapa.getCanvas().style.cursor = ''));
      // La rotación inicial se detiene al primer toque, clic, arrastre o rueda.
      for (const evento of ['mousedown', 'touchstart', 'wheel', 'dragstart'] as const) {
        mapa.on(evento, () => this.detenerGiro());
      }
    } catch {
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
