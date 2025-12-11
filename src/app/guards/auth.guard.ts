import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state): Promise<boolean | UrlTree> => {
  // Evitar bucle: Si ya estamos en /auth, permitir acceso
  if (state.url.startsWith('/auth')) {
    return true;
  }
  
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    // Esperar inicialización con timeout
    await Promise.race([
      authService.waitForInitialization(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )
    ]);
  } catch (error) {
    // Timeout en inicialización
  }

  if (authService.isAuthenticated()) {
    return true;
  } else {
    // Retornar UrlTree para que Angular maneje la navegación
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
};
