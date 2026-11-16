import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { Chart, ChartDataset } from 'chart.js';

/** Una línea de la gráfica: un valor por etiqueta del eje X (null = sin dato). */
export interface SerieGrafica {
  nombre: string;
  valores: (number | null)[];
}

/**
 * Colores y trazos por serie. Además del color, cada serie tiene su propio
 * patrón de línea para distinguirse también con daltonismo (WCAG: no depender
 * solo del color).
 */
const ESTILOS: { variable: string; respaldo: string; trazo: number[] }[] = [
  { variable: '--color-acento', respaldo: '#2e6b3f', trazo: [] },
  { variable: '--color-grafica-2', respaldo: '#8a4b14', trazo: [8, 4] },
  { variable: '--color-grafica-3', respaldo: '#1a5fb4', trazo: [2, 3] },
  { variable: '--color-grafica-4', respaldo: '#6b3fa0', trazo: [12, 3, 2, 3] },
];

/**
 * Gráfica de línea con Chart.js. La librería se descarga con import() solo
 * cuando la gráfica se dibuja, y se registran únicamente los módulos usados
 * (CLAUDE.md: importar solo lo necesario). Sin animaciones.
 * La gráfica es decorativa para lectores de pantalla: los mismos datos están
 * en una tabla en la página.
 */
@Component({
  selector: 'ap-grafica-linea',
  template: `<div class="contenedor"><canvas #lienzo aria-hidden="true"></canvas></div>`,
  styles: `
    .contenedor {
      position: relative;
      height: 16rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficaLinea {
  /** Etiquetas del eje X (fechas ya formateadas). */
  readonly etiquetas = input.required<string[]>();
  readonly series = input.required<SerieGrafica[]>();
  /** Formatea los valores del eje Y y del tooltip. */
  readonly formatear = input<(valor: number) => string>((v) => String(v));

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafica: Chart<'line', (number | null)[], string> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.grafica?.destroy());
    afterRenderEffect(() => {
      void this.dibujar(this.etiquetas(), this.series(), this.formatear());
    });
  }

  private async dibujar(
    etiquetas: string[],
    series: SerieGrafica[],
    formatear: (v: number) => string,
  ): Promise<void> {
    const {
      Chart,
      CategoryScale,
      Legend,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      Tooltip,
    } = await import('chart.js');
    Chart.register(
      CategoryScale,
      Legend,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      Tooltip,
    );

    const estilos = getComputedStyle(document.documentElement);
    const texto = estilos.getPropertyValue('--color-texto-suave').trim() || '#4b544e';
    const datasets: ChartDataset<'line', (number | null)[]>[] = series.map((s, i) => {
      const estilo = ESTILOS[i % ESTILOS.length]!;
      const color = estilos.getPropertyValue(estilo.variable).trim() || estilo.respaldo;
      return {
        label: s.nombre,
        data: s.valores,
        borderColor: color,
        backgroundColor: color,
        borderDash: estilo.trazo,
        borderWidth: 2,
        pointRadius: etiquetas.length > 60 ? 0 : 3,
        spanGaps: true,
        tension: 0,
      };
    });
    const datos = { labels: etiquetas, datasets };

    if (this.grafica) {
      this.grafica.data = datos;
      this.grafica.options.plugins!.legend!.display = series.length > 1;
      this.grafica.update('none');
      return;
    }
    this.grafica = new Chart<'line', (number | null)[], string>(this.lienzo().nativeElement, {
      type: 'line',
      data: datos,
      options: {
        animation: false,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: series.length > 1,
            position: 'bottom',
            labels: { color: texto, usePointStyle: false, boxWidth: 24 },
          },
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.dataset.label ?? ''}: ${c.parsed.y === null ? 'sin dato' : formatear(c.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: texto, maxTicksLimit: 6, maxRotation: 0 } },
          y: { ticks: { color: texto, callback: (v) => formatear(Number(v)) } },
        },
      },
    });
  }
}
