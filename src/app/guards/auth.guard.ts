import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperar a que la sesión se inicialice completamente
  await authService.waitForInitialization();

  // Verificar si el usuario está autenticado
  if (authService.isAuthenticated()) {
    return true;
  } else {
    // Redirigir al login si no está autenticado
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }
};
