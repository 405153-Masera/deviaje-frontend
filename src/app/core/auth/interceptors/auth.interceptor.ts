import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Agregar token si existe y el usuario está autenticado
    if (this.authService.isAuthenticated()) {
      const token = this.authService.getToken();
      if (token) {
        request = this.addTokenHeader(request, token);
      }
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token inválido o expirado
          this.handleUnauthorized();
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenHeader(
    request: HttpRequest<any>,
    token: string
  ): HttpRequest<any> {
    return request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  // MODIFICA el método handleUnauthorized en tu auth.interceptor.ts

  private handleUnauthorized(): void {
    // Obtener la URL actual antes de limpiar sesión
    const currentUrl = this.router.url;

    // Limpiar sesión
    this.authService.logout().subscribe(() => {
      // Solo redirigir a login si no estamos ya en una página pública
      const isPublicPage =
        currentUrl.includes('/home')
        currentUrl === '/';

      if (!isPublicPage) {
        this.router.navigate(['/user/login'], {
          queryParams: { returnUrl: currentUrl },
        });
      }
      // Si estamos en página pública, no redirigir - solo se actualiza la vista
    });
  }
}
