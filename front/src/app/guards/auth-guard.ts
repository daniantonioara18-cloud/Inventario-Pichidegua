import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/qr/', '/ficha/'];
  const currentUrl = state.url;

  // Si la ruta actual es pública, dejar pasar
  if (publicRoutes.some(prefix => currentUrl.startsWith(prefix))) {
    return true;
  }

  // Si hay sesión, dejar pasar
  if (authService.isLoggedIn()) {
    return true;
  }

  // No está logueado, mandar al login
  router.navigate(['/login']);
  return false;
};