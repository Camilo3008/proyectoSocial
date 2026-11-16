import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaginaPendiente } from '../../shared/pagina-pendiente/pagina-pendiente';

/**
 * Vista internacional. El globo (MapLibre) se cargará con import() dinámico
 * solo dentro de esta ruta, para no afectar el bundle inicial.
 */
@Component({
  selector: 'ap-internacional-page',
  imports: [PaginaPendiente],
  template: `
    <ap-pagina-pendiente
      titulo="El mundo"
      descripcion="Aquí podrás girar un globo terráqueo y ver el precio que reciben los productores en otros países."
      etapa="Etapa 4"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternacionalPage {}
