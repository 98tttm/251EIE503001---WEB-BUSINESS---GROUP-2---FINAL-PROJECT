import { Routes } from '@angular/router';

import { adminAuthChildGuard, adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.page').then(m => m.LoginPage)
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    canActivateChild: [adminAuthChildGuard],
    loadComponent: () => import('./layouts/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'collections/:collectionKey',
        loadComponent: () =>
          import('./pages/collections/collection-list.page').then(m => m.CollectionListPage)
      },
      {
        path: 'collections/:collectionKey/:id',
        loadComponent: () =>
          import('./pages/collections/collection-detail.page').then(m => m.CollectionDetailPage)
      },
      {
        path: 'admin/create-order',
        loadComponent: () =>
          import('./pages/collections/admin-order-create.page').then(m => m.AdminOrderCreatePage)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
