import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth'; // Verifica que la ruta sea correcta

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // Si tiene token, lo deja pasar
  } else {
    router.navigate(['/login']); // Si no, lo manda a loguearse
    return false;
  }
};