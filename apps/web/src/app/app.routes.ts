import { type Routes } from '@angular/router';

/** Todas las vistas se cargan de forma diferida (lazy loading). */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Hoy · AgroPrecios',
    loadComponent: () => import('./features/hoy/hoy.page').then((m) => m.HoyPage),
  },
  {
    path: 'historico',
    title: 'Histórico · AgroPrecios',
    loadComponent: () => import('./features/historico/historico.page').then((m) => m.HistoricoPage),
  },
  {
    path: 'nacional',
    title: 'Nacional · AgroPrecios',
    loadComponent: () => import('./features/nacional/nacional.page').then((m) => m.NacionalPage),
  },
  {
    path: 'internacional',
    title: 'Mundo · AgroPrecios',
    loadComponent: () =>
      import('./features/internacional/internacional.page').then((m) => m.InternacionalPage),
  },
  {
    path: 'fuentes',
    title: 'Fuentes · AgroPrecios',
    loadComponent: () => import('./features/fuentes/fuentes.page').then((m) => m.FuentesPage),
  },
  {
    // No aparece en la navegación pública (docs/PROYECTO.md §11.2).
    path: 'admin',
    title: 'Administración · AgroPrecios',
    loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
  },
  { path: '**', redirectTo: '' },
];
