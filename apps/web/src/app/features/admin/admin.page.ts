import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaginaPendiente } from '../../shared/pagina-pendiente/pagina-pendiente';

@Component({
  selector: 'ap-admin-page',
  imports: [PaginaPendiente],
  template: `
    <ap-pagina-pendiente
      titulo="Administración"
      descripcion="Acceso del administrador para cargar precios y ejecutar ingestas."
      etapa="Etapa 5"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {}
