import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/user/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as Array<string>;

  if (!authService.isAuthenticated()) {
    router.navigate(['/user/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No se requieren roles específicos
  }

  const activeRole = authService.getActiveRole();
  if (!activeRole) {
    console.error('❌ No hay rol activo definido');
    router.navigate(['/access-denied']);
    return false;
  }

  if (requiredRoles.includes(activeRole)) {
    console.log('✅ Acceso permitido con rol activo:', activeRole);
    return true;
  }

  router.navigate(['/access-denied']);
  return false;
};