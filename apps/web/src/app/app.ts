import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ActualizacionService } from './core/actualizacion';
import { ConexionService } from './core/conexion.service';
import { formatearHace } from './core/formato';
import { FrescuraService } from './core/frescura';

interface Pestana {
  ruta: string;
  etiqueta: string;
  icono: 'hoy' | 'historico' | 'mundo' | 'fuentes';
  exacta: boolean;
}

@Component({
  selector: 'ap-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly conexion = inject(ConexionService);
  protected readonly actualizacion = inject(ActualizacionService);
  private readonly frescura = inject(FrescuraService);

  /**
   * "Sin conexión · datos de hace 3 horas" cuando no hay red, o
   * "Conexión lenta · ..." cuando hay red pero el service worker respondió
   * desde la caché (pasó el tiempo de espera de 4 s).
   */
  protected readonly avisoDatos = computed(() => {
    const fecha = this.frescura.fechaRespuesta();
    const edad = fecha ? `datos de ${formatearHace(fecha, this.frescura.ahora())}` : null;
    if (!this.conexion.enLinea()) {
      return `Sin conexión · ${edad ?? 'mostrando los últimos datos guardados'}`;
    }
    if (this.frescura.desdeCache() && edad) {
      return `Conexión lenta · mostrando ${edad}`;
    }
    return null;
  });

  protected readonly pestanas: Pestana[] = [
    { ruta: '/', etiqueta: 'Hoy', icono: 'hoy', exacta: true },
    { ruta: '/historico', etiqueta: 'Histórico', icono: 'historico', exacta: false },
    { ruta: '/internacional', etiqueta: 'Mundo', icono: 'mundo', exacta: false },
    { ruta: '/fuentes', etiqueta: 'Fuentes', icono: 'fuentes', exacta: false },
  ];
}
