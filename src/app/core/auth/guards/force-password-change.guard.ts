import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que detecta si el usuario tiene una contraseña temporal
 * y lo redirige al componente de cambio forzoso de contraseña.
 */
export const forcePasswordChangeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();

  // Si el usuario tiene contraseña temporal, redirigir a cambio forzoso
  if (user && user.isTemporaryPassword === true) {
    console.log('⚠️ Usuario con contraseña temporal detectado - Redirigiendo a cambio forzoso');
    router.navigate(['/user/change-password'], {
      queryParams: { forced: 'true' }
    });
    return false;
  }

  // Si no tiene contraseña temporal, permitir acceso
  return true;
};