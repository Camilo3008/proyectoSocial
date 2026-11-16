import { type FuenteDto } from '@agroprecios/shared';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { API_URL } from '../../core/api';
import { ESTADO_FUENTE, FRECUENCIA, TIPO_FUENTE } from '../../core/etiquetas';

/** Transparencia: fuentes de datos y su última actualización (RF-06). */
@Component({
  selector: 'ap-fuentes-page',
  imports: [DatePipe],
  templateUrl: './fuentes.page.html',
  styleUrl: './fuentes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuentesPage {
  private readonly api = inject(API_URL);

  protected readonly fuentes = httpResource<FuenteDto[]>(() => `${this.api}/fuentes`);

  protected readonly estado = ESTADO_FUENTE;
  protected readonly frecuencia = FRECUENCIA;
  protected readonly tipo = TIPO_FUENTE;
}
