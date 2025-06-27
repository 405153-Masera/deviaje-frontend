import { Routes } from '@angular/router';
import { DeviajeMainLayoutComponent } from './shared/components/deviaje-main-layout/deviaje-main-layout.component';
import { DeviajeFlightsSearchComponent } from './features/public/components/deviaje-flights-search/deviaje-flights-search.component';
import { DeviajeFlightResultsComponent } from './features/public/components/deviaje-flight-results/deviaje-flight-results.component';
import { DeviajeHotelsSearchComponent } from './features/public/components/hotels/deviaje-hotels-search/deviaje-hotels-search.component';
import { DeviajeHotelsResultsComponent } from './features/public/components/hotels/deviaje-hotels-results/deviaje-hotels-results.component';
import { DeviajeLoginComponent } from './features/public/components/deviaje-login/deviaje-login.component';
import { DeviajeSignupComponent } from './features/public/components/deviaje-signup/deviaje-signup.component';
import { authGuard, roleGuard } from './core/auth/guards/auth.guard';
import { DeviajeUserProfileComponent } from './features/client/components/deviaje-user-profile/deviaje-user-profile.component';
import { DeviajeHotelDetailComponent } from './features/public/components/hotels/deviaje-hotel-detail/deviaje-hotel-detail.component';
import { DeviajeFlightBookingComponent } from './features/client/components/deviaje-flight-booking/deviaje-flight-booking.component';
import { DeviajeForgotPasswordComponent } from './shared/components/deviaje-forgot-password/deviaje-forgot-password.component';
import { DeviajeResetPasswordComponent } from './shared/components/deviaje-reset-password/deviaje-reset-password.component';
import { DeviajeAccessDeniedComponent } from './features/public/components/deviaje-accessdenied/deviaje-accessdenied.component';
import { DeviajeHotelBookingComponent } from './features/client/components/deviaje-hotel-booking/deviaje-hotel-booking.component';
import { DeviajeChangePasswordComponent } from './shared/components/deviaje-change-password/deviaje-change-password.component';
import { DeviajeAdminUserRegisterComponent } from './features/admin/components/deviaje-admin-user-register/deviaje-admin-user-register.component';
import { DeviajeUsersListComponent } from './features/admin/components/deviaje-users-list/deviaje-users-list.component';
import { TerminosCondicionesComponent } from './pages/legal/terminos-condiciones/terminos-condiciones.component';
import { PoliticaPrivacidadComponent } from './pages/legal/politica-privacidad/politica-privacidad.component';
import { PreguntasFrecuentesComponent } from './pages/legal/preguntas-frecuentes/preguntas-frecuentes.component';
import { DeviajePackagesSearchComponent } from './features/public/components/deviaje-packages-search/deviaje-packages-search.component';
import { DeviajePackagesResultsComponent } from './features/public/components/deviaje-packages-results/deviaje-packages-results.component';

export const routes: Routes = [
  // Ruta principal
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Rutas públicas para la autenticacion
  { path: 'user/login', component: DeviajeLoginComponent },
  { path: 'user/signup', component: DeviajeSignupComponent },
  { path: 'user/forgot-password', component: DeviajeForgotPasswordComponent },
  { path: 'user/reset-password', component: DeviajeResetPasswordComponent },
  { path: 'user/change-password', component: DeviajeChangePasswordComponent },

  { path: 'legal/terminos-condiciones', component: TerminosCondicionesComponent },
  { path: 'legal/politica-privacidad', component: PoliticaPrivacidadComponent },
  { path: 'legal/preguntas-frecuentes', component: PreguntasFrecuentesComponent },
  {
    path: 'home',
    component: DeviajeMainLayoutComponent,
    children: [
      { path: 'flight/search', component: DeviajeFlightsSearchComponent },
      { path: 'flight/results', component: DeviajeFlightResultsComponent },
      { path: 'hotels/search', component: DeviajeHotelsSearchComponent },
      { path: 'hotels/results', component: DeviajeHotelsResultsComponent },
      { path: 'hotels/detail/:code', component: DeviajeHotelDetailComponent },
      { path: 'packages/search', component: DeviajePackagesSearchComponent },
      { path: 'packages/results', component: DeviajePackagesResultsComponent },
      { path: 'flight/booking', component: DeviajeFlightBookingComponent },
      { path: 'hotels/booking', component: DeviajeHotelBookingComponent }, // Reutilizando el componente para reservas de hoteles
    ],
  },
  // Rutas que requieren autenticación
  {
    path: 'profile',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard],
    children: [{ path: '', component: DeviajeUserProfileComponent },
       { path: 'user/change-password', component: DeviajeChangePasswordComponent },
    ],
    
  },

  // Mis reservas (requiere autenticación)
  {
    path: 'bookings',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard],
    children: [
      //{ path: '', component: DeviajeBookingsComponent }
    ],
  },

  // Rutas específicas para administradores
  {
    path: 'admin',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMINISTRADOR'] },
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        children: [
          { path: '', redirectTo: 'list', pathMatch: 'full' },
          { path: 'list', component: DeviajeUsersListComponent },
          { path: 'register', component: DeviajeAdminUserRegisterComponent },
          //{ path: 'edit/:id', component: DeviajeUserEditComponent },
        ],
      },
      {
        path: 'bookings',
        children: [
          //{ path: '', redirectTo: 'all', pathMatch: 'full' },
          //{ path: 'all', component: DeviajeBookingsComponent }, // Mismo componente, mostrará diferente contenido
          //{ path: 'flights', component: DeviajeBookingsComponent }, // Mismo componente con filtro
          //{ path: 'hotels', component: DeviajeBookingsComponent }, // Mismo componente con filtro
          //{ path: 'packages', component: DeviajeBookingsComponent }, // Mismo componente con filtro
          //{ path: 'tours', component: DeviajeBookingsComponent }, // Mismo componente con filtro
        ],
      },
      //{ path: 'analytics', component: DeviajeAnalyticsComponent },
    ],
  },

  // Rutas específicas para agentes
  {
    path: 'agent',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['AGENTE'] },
    children: [
      { path: '', redirectTo: 'clients', pathMatch: 'full' },
      //{ path: 'clients', component: DeviajeClientsListComponent },
      //{ path: 'clients/:id', component: DeviajeClientDetailComponent },
    ],
  },

  // Ruta para acceso denegado
  { path: 'access-denied', component: DeviajeAccessDeniedComponent },

  // Ruta de página no encontrada
  { path: '**', redirectTo: '/home' },
];
