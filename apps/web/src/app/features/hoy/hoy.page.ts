import { type PreciosHoyDto } from '@agroprecios/shared';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { API_URL } from '../../core/api';
import { ConexionService } from '../../core/conexion.service';
import {
  formatearFecha,
  formatearFechaHora,
  formatearFechaLarga,
  formatearTasa,
} from '../../core/formato';
import { TarjetaPrecio } from '../../shared/tarjeta-precio/tarjeta-precio';

/** Pantalla principal: precio de referencia del día por producto (RF-01). */
@Component({
  selector: 'ap-hoy-page',
  imports: [TarjetaPrecio],
  templateUrl: './hoy.page.html',
  styleUrl: './hoy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HoyPage {
  private readonly api = inject(API_URL);
  protected readonly conexion = inject(ConexionService);

  protected readonly precios = httpResource<PreciosHoyDto>(() => `${this.api}/precios/hoy`);

  protected readonly datos = computed(() =>
    this.precios.hasValue() ? this.precios.value() : null,
  );

  protected readonly fechaHoy = computed(() => {
    const d = this.datos();
    return d ? formatearFechaLarga(d.hoy) : null;
  });

  protected readonly actualizado = computed(() => {
    const d = this.datos();
    return d ? formatearFechaHora(d.generadoEn) : null;
  });

  protected readonly trm = computed(() => {
    const t = this.datos()?.trm;
    return t
      ? {
          valor: formatearTasa(t.valor),
          fecha: formatearFecha(t.fecha),
          fuente: t.fuente.nombre,
          licencia: t.fuente.licencia,
        }
      : null;
  });

  protected readonly pendientes = computed(
    () =>
      this.datos()
        ?.sinDatos.map((p) => p.nombre)
        .join(', ') ?? '',
  );
}
