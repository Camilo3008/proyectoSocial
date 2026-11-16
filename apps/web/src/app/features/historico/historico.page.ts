import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaginaPendiente } from '../../shared/pagina-pendiente/pagina-pendiente';

@Component({
  selector: 'ap-historico-page',
  imports: [PaginaPendiente],
  template: `
    <ap-pagina-pendiente
      titulo="Histórico"
      descripcion="Aquí verás cómo ha cambiado el precio de cada producto en los últimos días, meses y años."
      etapa="Etapa 2"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricoPage {}
