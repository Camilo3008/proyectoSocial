import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaginaPendiente } from '../../shared/pagina-pendiente/pagina-pendiente';

@Component({
  selector: 'ap-nacional-page',
  imports: [PaginaPendiente],
  template: `
    <ap-pagina-pendiente
      titulo="Mercados nacionales"
      descripcion="Aquí podrás comparar el precio de un producto entre los mercados mayoristas del país."
      etapa="Etapa 2"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NacionalPage {}
