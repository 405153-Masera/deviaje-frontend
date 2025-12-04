// ============================================
// ARCHIVO: src/app/core/auth/interceptors/auth.interceptor.ts
// REEMPLAZAR TODO EL CONTENIDO
// ============================================

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional que agrega el token JWT a las peticiones
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Agregar token si el usuario está autenticado
  let authReq = req;
  
  if (authService.isAuthenticated()) {
    const token = authService.getToken();
    if (token) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`),
      });
      console.log('🔐 Token agregado al request:', req.url);
    }
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.log('❌ Error 401 - Token inválido o expirado');
        handleUnauthorized(authService, router);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Maneja errores de autenticación (401)
 */
function handleUnauthorized(authService: AuthService, router: Router): void {
  const currentUrl = router.url;

  authService.logout().subscribe(() => {
    const isPublicPage =
      currentUrl.includes('/home') ||
      currentUrl === '/';

    if (!isPublicPage) {
      router.navigate(['/user/login'], {
        queryParams: { returnUrl: currentUrl },
      });
    }
  });
}