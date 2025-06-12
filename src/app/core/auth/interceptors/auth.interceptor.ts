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

  // EN TU auth.interceptor.ts, MODIFICAR el método handleUnauthorized:

  private handleUnauthorized(): void {
    // Obtener la URL actual antes de limpiar sesión
    const currentUrl = this.router.url;

    // Limpiar sesión (esto ya no redirige automáticamente)
    this.authService.logout().subscribe(() => {
      // Verificar si estamos en una página que requiere autenticación
      const isPublicPage =
        currentUrl.includes('/home/hotels/search') ||
        currentUrl.includes('/home/hotels/results') ||
        currentUrl.includes('/home/hotels/detail') ||
        currentUrl.includes('/home/hotels/booking') ||
        currentUrl.includes('/home/flight/search') ||
        currentUrl.includes('/home/flight/results') ||
        currentUrl.includes('/home/flight/booking') ||
        currentUrl === '/home' ||
        currentUrl === '/';

      if (!isPublicPage) {
        // Solo redirigir a login si estamos en página privada
        console.log(
          'Token inválido: redirigiendo a login desde página privada'
        );
        this.router.navigate(['/user/login'], {
          queryParams: { returnUrl: currentUrl },
        });
      } else {
        console.log(
          'Token inválido: permaneciendo en página pública, modo invitado'
        );
        // Los componentes se actualizarán automáticamente al modo invitado
      }
    });
  }
}
