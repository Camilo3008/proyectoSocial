import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConexionService } from './core/conexion.service';

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

  protected readonly pestanas: Pestana[] = [
    { ruta: '/', etiqueta: 'Hoy', icono: 'hoy', exacta: true },
    { ruta: '/historico', etiqueta: 'Histórico', icono: 'historico', exacta: false },
    { ruta: '/internacional', etiqueta: 'Mundo', icono: 'mundo', exacta: false },
    { ruta: '/fuentes', etiqueta: 'Fuentes', icono: 'fuentes', exacta: false },
  ];
}
