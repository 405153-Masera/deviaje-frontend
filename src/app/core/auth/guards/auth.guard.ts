import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
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

  // Verificar cada rol requerido
  for (const role of requiredRoles) {
    if (authService.hasRole(role)) {
      return true;
    }
  }

  // Si no tiene ninguno de los roles requeridos, redireccionar a página de acceso denegado
  router.navigate(['/access-denied']);
  return false;
};

/**
 * Guard para aplicar protección de rol en rutas hijas
 * Este guard verifica los roles tanto en la ruta padre como en la ruta hija
 */
export const roleGuardWithInheritance: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/user/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  // Recolectar todos los roles requeridos de la jerarquía de rutas
  const requiredRoles = collectRolesFromRoute(route);

  if (requiredRoles.length === 0) {
    return true; // No se requieren roles específicos
  }

  // Verificar si el usuario tiene al menos uno de los roles requeridos
  for (const role of requiredRoles) {
    if (authService.hasRole(role)) {
      return true;
    }
  }

  // Si no tiene ninguno de los roles requeridos, redireccionar a página de acceso denegado
  router.navigate(['/access-denied']);
  return false;
};

/**
 * Recolecta todos los roles requeridos desde la ruta actual hasta la raíz
 */
function collectRolesFromRoute(route: ActivatedRouteSnapshot): string[] {
  const roles: string[] = [];
  let currentRoute: ActivatedRouteSnapshot | null = route;

  while (currentRoute) {
    if (currentRoute.data['roles']) {
      const routeRoles = currentRoute.data['roles'] as Array<string>;
      roles.push(...routeRoles);
    }
    currentRoute = currentRoute.parent;
  }

  // Eliminar duplicados
  return [...new Set(roles)];
}