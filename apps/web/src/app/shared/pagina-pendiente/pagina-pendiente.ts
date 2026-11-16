import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Marcador de posición para vistas que se construyen en etapas posteriores. */
@Component({
  selector: 'ap-pagina-pendiente',
  template: `
    <h1>{{ titulo() }}</h1>
    <div class="tarjeta">
      <p>{{ descripcion() }}</p>
      <p class="etapa">Disponible en la {{ etapa() }}.</p>
    </div>
  `,
  styles: `
    .etapa {
      margin: 0;
      color: var(--color-texto-suave);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginaPendiente {
  readonly titulo = input.required<string>();
  readonly descripcion = input.required<string>();
  readonly etapa = input.required<string>();
}
