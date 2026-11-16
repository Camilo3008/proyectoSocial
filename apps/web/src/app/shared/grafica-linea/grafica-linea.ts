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
import type { Chart } from 'chart.js';

export interface PuntoGrafica {
  /** Etiqueta del eje X (fecha ya formateada). */
  etiqueta: string;
  valor: number;
}

/**
 * Gráfica de línea con Chart.js. La librería se descarga con import() solo
 * cuando la gráfica se dibuja, y se registran únicamente los módulos usados
 * (CLAUDE.md: importar solo lo necesario). Sin animaciones.
 * La gráfica es decorativa para lectores de pantalla: los mismos datos están
 * en la tabla de la página.
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
  readonly puntos = input.required<PuntoGrafica[]>();
  /** Formatea los valores del eje Y y del tooltip. */
  readonly formatear = input<(valor: number) => string>((v) => String(v));

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafica: Chart<'line'> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.grafica?.destroy());
    afterRenderEffect(() => {
      void this.dibujar(this.puntos(), this.formatear());
    });
  }

  private async dibujar(puntos: PuntoGrafica[], formatear: (v: number) => string): Promise<void> {
    const {
      Chart,
      CategoryScale,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      Tooltip,
    } = await import('chart.js');
    Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip);

    const estilos = getComputedStyle(document.documentElement);
    const acento = estilos.getPropertyValue('--color-acento').trim() || '#2e6b3f';
    const texto = estilos.getPropertyValue('--color-texto-suave').trim() || '#4b544e';

    const datos = {
      labels: puntos.map((p) => p.etiqueta),
      datasets: [
        {
          data: puntos.map((p) => p.valor),
          borderColor: acento,
          backgroundColor: acento,
          borderWidth: 2,
          pointRadius: puntos.length > 60 ? 0 : 3,
          tension: 0,
        },
      ],
    };

    if (this.grafica) {
      this.grafica.data = datos;
      this.grafica.update('none');
      return;
    }
    this.grafica = new Chart(this.lienzo().nativeElement, {
      type: 'line',
      data: datos,
      options: {
        animation: false,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => formatear(c.parsed.y ?? 0) } },
        },
        scales: {
          x: { ticks: { color: texto, maxTicksLimit: 6, maxRotation: 0 } },
          y: { ticks: { color: texto, callback: (v) => formatear(Number(v)) } },
        },
      },
    });
  }
}
