import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Ilustración simple de cada producto en SVG en línea (sin descargas extra,
 * funciona sin conexión). Es decorativa: el nombre del producto siempre va en
 * texto al lado.
 */
@Component({
  selector: 'ap-icono-producto',
  template: `
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      @switch (producto()) {
        @case ('cafe') {
          <!-- Rama de café: hoja y tres cerezas -->
          <path d="M6 28C5 14 17 5 33 6c1 15-10 25-27 22z" fill="#3f8a4a" />
          <path
            d="M8 26C15 19 22 14 30 9"
            stroke="#245c2e"
            stroke-width="1.6"
            fill="none"
            stroke-linecap="round"
          />
          <circle cx="27" cy="33" r="7.5" fill="#b3342a" />
          <circle cx="37.5" cy="28" r="6.5" fill="#c9473a" />
          <circle cx="36" cy="39.5" r="6" fill="#962a22" />
          <circle cx="24.5" cy="30.5" r="2" fill="#fff" opacity=".45" />
          <circle cx="35.5" cy="26" r="1.7" fill="#fff" opacity=".45" />
        }
        @case ('platano') {
          <!-- Plátano verde -->
          <path
            d="M7 33c11 9 29 5 35-12 .8-2.4-1.6-3.6-3-2-7 9-17 12-29 9-2.6-.6-4.6 3.4-3 5z"
            fill="#5f9a2c"
          />
          <path
            d="M11 33c10 4 22 1 28-9"
            stroke="#3f6d1f"
            stroke-width="1.6"
            fill="none"
            stroke-linecap="round"
          />
          <path d="M39 19l3.5-6" stroke="#4a3a1a" stroke-width="3" stroke-linecap="round" />
        }
        @case ('banano') {
          <!-- Banano maduro -->
          <path
            d="M7 31c11 10 30 6 35-11 .7-2.4-1.7-3.4-3-1.8-7 9-18 11-29 8.5-2.6-.6-4.6 2.7-3 4.3z"
            fill="#f2c230"
          />
          <path
            d="M11 31.5c10 4.5 22 1.5 28-8.5"
            stroke="#c99a12"
            stroke-width="1.6"
            fill="none"
            stroke-linecap="round"
          />
          <path d="M39 18l3-5.5" stroke="#5b4513" stroke-width="3" stroke-linecap="round" />
          <circle cx="7.6" cy="31.6" r="1.6" fill="#5b4513" />
        }
        @case ('cacao') {
          <!-- Mazorca de cacao -->
          <ellipse cx="24" cy="26" rx="11" ry="17" transform="rotate(28 24 26)" fill="#c0661f" />
          <path
            d="M15 37c3-9 8-18 16-25M19 40c2-9 7-18 15-24M13 32c3-8 8-15 14-21"
            stroke="#8a3b12"
            stroke-width="1.6"
            fill="none"
            stroke-linecap="round"
          />
          <path d="M33 10l4-5" stroke="#4a6b1f" stroke-width="3" stroke-linecap="round" />
        }
        @case ('pitaya') {
          <!-- Pitaya amarilla con escamas -->
          <path d="M24 9c9 0 15 8 15 18s-6 15-15 15S9 37 9 27 15 9 24 9z" fill="#f0c419" />
          <path
            d="M24 9l-2-5 4 1zM14 16l-5-2 3 4zM34 16l5-2-3 4zM11 29l-5 1 4 2zM37 29l5 1-4 2zM18 40l-3 4 4-1zM30 40l3 4-4-1z"
            fill="#6a9a2c"
          />
          <path
            d="M18 21l3 3M27 18l3 3M16 30l3 3M25 28l3 3M31 34l3 3"
            stroke="#c99a12"
            stroke-width="2"
            stroke-linecap="round"
          />
        }
        @default {
          <!-- Brote genérico -->
          <path d="M24 42V22" stroke="#3f6d1f" stroke-width="3" stroke-linecap="round" />
          <path d="M24 26C14 26 9 19 9 12c9 0 15 5 15 14z" fill="#5f9a2c" />
          <path d="M24 22c0-8 6-13 15-13 0 8-6 13-15 13z" fill="#3f8a4a" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      width: 2.5rem;
      height: 2.5rem;
      flex: none;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconoProducto {
  /** Slug del producto: cafe, platano, banano, cacao, pitaya. */
  readonly producto = input.required<string>();
}
