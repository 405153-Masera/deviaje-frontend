import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RoutePermissionService {
  private router = inject(Router);

  /**
   * Verifica si un rol tiene permiso para acceder a la ruta actual
   * @param role Rol a verificar
   * @returns true si el rol tiene permiso, false en caso contrario
   */
  canAccessCurrentRoute(role: string): boolean {
    const currentUrl = this.router.url;
    console.log('🔍 Verificando acceso para rol:', role, '- URL:', currentUrl);
    
    // Rutas públicas que no requieren roles específicos
    const publicRoutes = [
      '/home',
      '/user/login',
      '/user/signup',
      '/user/forgot-password',
      '/user/reset-password',
      '/legal',
      '/access-denied'
    ];

    // Si la ruta es pública, permitir acceso
    for (const publicRoute of publicRoutes) {
      if (currentUrl.startsWith(publicRoute)) {
        console.log('✅ Ruta pública - Acceso permitido');
        return true;
      }
    }

    // Verificar rutas protegidas
    const requiredRoles = this.getRequiredRolesForUrl(currentUrl);
    
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('✅ Ruta sin restricciones de rol - Acceso permitido');
      return true;
    }

    const hasPermission = requiredRoles.includes(role);
    console.log(hasPermission ? '✅ Acceso permitido' : '❌ Acceso denegado', '- Roles requeridos:', requiredRoles);
    
    return hasPermission;
  }

  /**
   * Obtiene los roles requeridos para una URL específica
   * @param url URL a verificar
   * @returns Array de roles requeridos o undefined si no hay restricciones
   */
  private getRequiredRolesForUrl(url: string): string[] | undefined {
    // Mapa de rutas y sus roles requeridos
    const routeRoleMap: { [key: string]: string[] } = {
      '/admin': ['ADMINISTRADOR'],
      '/agent': ['AGENTE', 'ADMINISTRADOR'],
      '/bookings': [],
      '/profile': [] // Solo requiere autenticación, no roles específicos
    };

    // Encontrar el prefijo de ruta que coincida
    for (const [routePrefix, roles] of Object.entries(routeRoleMap)) {
      if (url.startsWith(routePrefix)) {
        return roles.length > 0 ? roles : undefined;
      }
    }

    return undefined;
  }
}