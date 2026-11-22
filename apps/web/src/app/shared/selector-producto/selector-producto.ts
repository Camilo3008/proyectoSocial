import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconoProducto } from '../icono-producto/icono-producto';

export interface OpcionProducto {
  slug: string;
  nombre: string;
}

/**
 * Botones grandes con la ilustración de cada producto. Reemplaza al <select>
 * para que la elección se entienda con solo mirar (usuarios con poca
 * experiencia en aplicaciones).
 */
@Component({
  selector: 'ap-selector-producto',
  imports: [IconoProducto],
  template: `
    <fieldset class="selector">
      <legend class="paso">
        @if (paso()) {
          <span class="paso__numero" aria-hidden="true">{{ paso() }}</span>
        }
        {{ titulo() }}
      </legend>
      <div class="selector__opciones">
        @for (p of opciones(); track p.slug) {
          <button
            type="button"
            class="chip producto--{{ p.slug }}"
            [class.chip--activo]="p.slug === actual()"
            [attr.aria-pressed]="p.slug === actual()"
            (click)="elegir.emit(p.slug)"
          >
            <ap-icono-producto [producto]="p.slug" />
            <span>{{ p.nombre }}</span>
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: `
    .selector {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .selector__opciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-2);
      min-height: 3.5rem;
      padding: var(--esp-1) var(--esp-4) var(--esp-1) var(--esp-2);
      border: 2px solid var(--color-borde-fuerte);
      border-radius: var(--radio-pildora);
      background: var(--color-superficie);
      color: var(--color-texto);
      font-weight: 700;
      cursor: pointer;
    }
    .chip:hover {
      border-color: var(--tono, var(--color-acento));
    }
    .chip--activo {
      border-color: var(--tono, var(--color-acento));
      background: var(--tono-suave, var(--color-acento-suave));
      color: var(--tono, var(--color-acento-oscuro));
      box-shadow: inset 0 0 0 1px var(--tono, var(--color-acento));
    }
    .chip--activo::after {
      content: '✓';
      font-weight: 800;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorProducto {
  readonly opciones = input.required<readonly OpcionProducto[]>();
  readonly actual = input.required<string>();
  readonly titulo = input('Elija el producto');
  /** Número del paso ("1"), si la pantalla guía al usuario por pasos. */
  readonly paso = input<string | null>(null);
  readonly elegir = output<string>();
}
