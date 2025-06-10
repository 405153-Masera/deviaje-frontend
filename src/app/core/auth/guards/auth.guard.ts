import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as Array<string>;

  if (authService.isAuthenticated()) {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No se requieren roles específicos
    }

    // Verificar cada rol requerido
    for (const role of requiredRoles) {
      if (authService.hasRole(role)) {
        return true;
      }
    }

    // Si no tiene ninguno de los roles requeridos, redireccionar a página de acceso denegado
    router.navigate(['/access-denied']);
    return false;
  }

   // Si el usuario no está autenticado, redirigir al login
  router.navigate(['/user/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
