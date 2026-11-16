import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaginaPendiente } from '../../shared/pagina-pendiente/pagina-pendiente';

@Component({
  selector: 'ap-hoy-page',
  imports: [PaginaPendiente],
  template: `
    <ap-pagina-pendiente
      titulo="Precios de hoy"
      descripcion="Aquí verás el precio de referencia del día para café, plátano, banano, cacao y pitaya, con su fuente y su fecha."
      etapa="Etapa 1 (café)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HoyPage {}
