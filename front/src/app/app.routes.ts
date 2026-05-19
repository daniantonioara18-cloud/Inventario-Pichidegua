import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { LoginComponent } from './login/login';
import { ItemsComponent } from './items/items';
import { MovimientosComponent } from './movimientos/movimientos';
import { UsuariosComponent } from './usuarios/usuarios';
import { DashboardComponent } from './dashboard/dashboard';

export const routes: Routes = [
  // Rutas PÚBLICAS (sin protección)
  { path: 'login', component: LoginComponent },
  
  // QR redirect: detecta si hay sesión y redirige
  {
    path: 'qr/:uuid',
    loadComponent: () => import('./qr-redirect/qr-redirect.component').then(m => m.QrRedirectComponent)
  },
  
  // Ficha pública: solo lectura, no necesita login
  {
    path: 'ficha/:uuid',
    loadComponent: () => import('./ficha-publica/ficha-publica.component').then(m => m.FichaPublicaComponent)
  },

  // Rutas PROTEGIDAS (solo accesibles si hay sesión)
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'items', component: ItemsComponent },
      { path: 'movimientos', component: MovimientosComponent },
      { path: 'usuarios', component: UsuariosComponent },
    ]
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' }
];