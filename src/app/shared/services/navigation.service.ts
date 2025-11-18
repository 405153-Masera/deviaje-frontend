import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private previousUrl: string = '/home';
  private currentUrl: string = '/home';

  constructor(private router: Router) {
    // Escuchar TODOS los eventos de navegación
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        console.log('🗺️ NAVEGACIÓN COMPLETA:', {
          de: this.currentUrl,
          a: event.urlAfterRedirects,
          tiempo: new Date().toLocaleTimeString(),
        });

        this.previousUrl = this.currentUrl;
        this.currentUrl = event.urlAfterRedirects;
      } else {
        // Log otros eventos importantes
        console.log('🗺️ Evento navegación:', event.constructor.name, event);
      }
    });
  }

  getPreviousUrl(): string {
    return this.previousUrl;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  // Obtener la mejor URL de retorno
  getBestReturnUrl(queryParamReturnUrl?: string): string {
    // 1. Si hay returnUrl en queryParams, usarlo (viene de guard)
    if (queryParamReturnUrl) {
      console.log('🎯 ReturnUrl desde queryParams:', queryParamReturnUrl);
      return queryParamReturnUrl;
    }

    // 2. Si hay URL anterior válida, usarla
    if (
      this.previousUrl &&
      this.previousUrl !== '/user/login' &&
      this.previousUrl !== '/user/signup'
    ) {
      console.log('🎯 ReturnUrl desde navegación anterior:', this.previousUrl);
      return this.previousUrl;
    }

    // 3. Fallback
    console.log('🎯 ReturnUrl fallback al home');
    return '/home';
  }
}
