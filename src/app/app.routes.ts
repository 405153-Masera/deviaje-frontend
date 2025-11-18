import { Routes } from '@angular/router';
import { DeviajeMainLayoutComponent } from './shared/components/deviaje-main-layout/deviaje-main-layout.component';
import { authGuard, roleGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  // Ruta principal
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  
  // === AUTENTICACIÓN ===
  {
    path: 'user/login',
    loadComponent: () => import('./features/public/components/deviaje-login/deviaje-login.component')
      .then(m => m.DeviajeLoginComponent)
  },
  {
    path: 'user/signup',
    loadComponent: () => import('./features/public/components/deviaje-signup/deviaje-signup.component')
      .then(m => m.DeviajeSignupComponent)
  },
  {
    path: 'user/forgot-password',
    loadComponent: () => import('./shared/components/deviaje-forgot-password/deviaje-forgot-password.component')
      .then(m => m.DeviajeForgotPasswordComponent)
  },
  {
    path: 'user/reset-password',
    loadComponent: () => import('./shared/components/deviaje-reset-password/deviaje-reset-password.component')
      .then(m => m.DeviajeResetPasswordComponent)
  },

  // === LEGAL ===
  {
    path: 'legal/terminos-condiciones',
    loadComponent: () => import('./pages/legal/terminos-condiciones/terminos-condiciones.component')
      .then(m => m.TerminosCondicionesComponent)
  },
  {
    path: 'legal/politica-privacidad',
    loadComponent: () => import('./pages/legal/politica-privacidad/politica-privacidad.component')
      .then(m => m.PoliticaPrivacidadComponent)
  },
  {
    path: 'legal/preguntas-frecuentes',
    loadComponent: () => import('./pages/legal/preguntas-frecuentes/preguntas-frecuentes.component')
      .then(m => m.PreguntasFrecuentesComponent)
  },

  // === HOME (con layout) ===
  {
    path: 'home',
    component: DeviajeMainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./shared/components/deviaje-home/deviaje-home.component')
          .then(m => m.HomeComponentComponent)
      },
      // VUELOS
      {
        path: 'flight/search',
        loadComponent: () => import('./features/public/components/deviaje-flights-search/deviaje-flights-search.component')
          .then(m => m.DeviajeFlightsSearchComponent)
      },
      {
        path: 'flight/results',
        loadComponent: () => import('./features/public/components/deviaje-flight-results/deviaje-flight-results.component')
          .then(m => m.DeviajeFlightResultsComponent)
      },
      {
        path: 'flight/booking',
        loadComponent: () => import('./features/client/components/deviaje-flight-booking/deviaje-flight-booking.component')
          .then(m => m.DeviajeFlightBookingComponent)
      },
      // HOTELES
      {
        path: 'hotels/search',
        loadComponent: () => import('./features/public/components/hotels/deviaje-hotels-search/deviaje-hotels-search.component')
          .then(m => m.DeviajeHotelsSearchComponent)
      },
      {
        path: 'hotels/results',
        loadComponent: () => import('./features/public/components/hotels/deviaje-hotels-results/deviaje-hotels-results.component')
          .then(m => m.DeviajeHotelsResultsComponent)
      },
      {
        path: 'hotels/detail/:code',
        loadComponent: () => import('./features/public/components/hotels/deviaje-hotel-detail/deviaje-hotel-detail.component')
          .then(m => m.DeviajeHotelDetailComponent)
      },
      {
        path: 'hotels/booking',
        loadComponent: () => import('./features/client/components/deviaje-hotel-booking/deviaje-hotel-booking.component')
          .then(m => m.DeviajeHotelBookingComponent)
      },
      // PAQUETES
      {
        path: 'packages/search',
        loadComponent: () => import('./features/public/components/deviaje-packages-search/deviaje-packages-search.component')
          .then(m => m.DeviajePackagesSearchComponent)
      },
      {
        path: 'packages/results',
        loadComponent: () => import('./features/public/components/deviaje-packages-results/deviaje-packages-results.component')
          .then(m => m.DeviajePackagesResultsComponent)
      },
      {
        path: 'packages/booking',
        loadComponent: () => import('./features/client/components/deviaje-package-booking/deviaje-package-booking.component')
          .then(m => m.DeviajePackageBookingComponent)
      }
    ]
  },

  // === PERFIL (requiere auth) ===
  {
    path: 'profile',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/client/components/deviaje-user-profile/deviaje-user-profile.component')
          .then(m => m.DeviajeUserProfileComponent)
      },
      // {
      //   path: 'edit',
      //   loadComponent: () => import('./features/client/components/deviaje-user-profile-edit/deviaje-user-profile-edit.component')
      //     .then(m => m.DeviajeUserProfileEditComponent)
      // }
    ]
  },

  // === RESERVAS (requiere auth) ===
  {
    path: 'bookings',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['CLIENTE'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/client/components/deviaje-bookings/deviaje-bookings.component')
          .then(m => m.DeviajeBookingsComponent)
      },
      // {
      //   path: ':id',
      //   loadComponent: () => import('./features/client/components/detalle-reserva/detalle-reserva.component')
      //     .then(m => m.DetalleReservaComponent)
      // }
    ]
  },

  // === ADMIN (requiere auth + rol) ===
  {
    path: 'admin',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMINISTRADOR'] },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      // {
      //   path: 'dashboard',
      //   loadComponent: () => import('./features/admin/components/deviaje-admin-dashboard/deviaje-admin-dashboard.component')
      //     .then(m => m.DeviajeAdminDashboardComponent)
      // },
      {
        path: 'users/list',
        loadComponent: () => import('./features/admin/components/deviaje-users-list/deviaje-users-list.component')
          .then(m => m.DeviajeUsersListComponent)
      },
      {
        path: 'users/register',
        loadComponent: () => import('./features/admin/components/deviaje-admin-user-register/deviaje-admin-user-register.component')
          .then(m => m.DeviajeAdminUserRegisterComponent)
      },
      // {
      //   path: 'reservations',
      //   loadComponent: () => import('./features/admin/components/deviaje-admin-reservations/deviaje-admin-reservations.component')
      //     .then(m => m.DeviajeAdminReservationsComponent)
      // }
    ]
  },

  // === AGENTES (requiere auth + rol) ===
  {
    path: 'agent',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['AGENTE', 'ADMINISTRADOR'] },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      // {
      //   path: 'dashboard',
      //   loadComponent: () => import('./features/agent/components/deviaje-agent-dashboard/deviaje-agent-dashboard.component')
      //     .then(m => m.DeviajeAgentDashboardComponent)
      // },
      // {
      //   path: 'clients',
      //   loadComponent: () => import('./features/agent/components/deviaje-agent-clients/deviaje-agent-clients.component')
      //     .then(m => m.DeviajeAgentClientsComponent)
      // }
    ]
  },

  // === ACCESO DENEGADO ===
  {
    path: 'access-denied',
    loadComponent: () => import('./features/public/components/deviaje-accessdenied/deviaje-accessdenied.component')
      .then(m => m.DeviajeAccessDeniedComponent)
  },

  // === 404 ===
  // {
  //   path: '**',
  //   loadComponent: () => import('./shared/components/page-not-found/page-not-found.component')
  //     .then(m => m.PageNotFoundComponent)
  // }
];