import { Routes } from '@angular/router';
import { DeviajeMainLayoutComponent } from './shared/components/deviaje-main-layout/deviaje-main-layout.component';
import { DeviajeFlightsSearchComponent } from './features/public/components/deviaje-flights-search/deviaje-flights-search.component';
import { DeviajeFlightResultsComponent } from './features/public/components/deviaje-flight-results/deviaje-flight-results.component';
import { DeviajeHotelsSearchComponent } from './features/public/components/hotels/deviaje-hotels-search/deviaje-hotels-search.component';
import { DeviajeHotelsResultsComponent } from './features/public/components/hotels/deviaje-hotels-results/deviaje-hotels-results.component';
import { DeviajeLoginComponent } from './features/public/components/deviaje-login/deviaje-login.component';
import { DeviajeSignupComponent } from './features/public/components/deviaje-signup/deviaje-signup.component';
import { authGuard } from './core/auth/guards/auth.guard';
import { DeviajeUserProfileComponent } from './features/client/components/deviaje-user-profile/deviaje-user-profile.component';
import { DeviajeHotelDetailComponent } from './features/public/components/hotels/deviaje-hotel-detail/deviaje-hotel-detail.component';
import { DeviajeFlightBookingComponent } from './features/client/components/deviaje-flight-booking/deviaje-flight-booking.component';

export const routes: Routes = [

  // Ruta principal
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  
  // Rutas públicas para la autenticacion
  { path: 'user/login', component: DeviajeLoginComponent },
  { path: 'user/signup', component: DeviajeSignupComponent },
  {
    path: 'home',
    component: DeviajeMainLayoutComponent,
    children: [
      { path: 'flight/search', component: DeviajeFlightsSearchComponent },
      { path: 'flight/results', component: DeviajeFlightResultsComponent },
      { path: 'hotels/search', component: DeviajeHotelsSearchComponent },
      { path: 'hotels/results', component: DeviajeHotelsResultsComponent },
      { path: 'hotels/detail/:code', component: DeviajeHotelDetailComponent },
      { path: 'flight/booking', component: DeviajeFlightBookingComponent }
    ]
  },
  {
    path: 'home',
    component: DeviajeMainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'user/profile', component: DeviajeUserProfileComponent },
    ]
  },
  // Ruta de página no encontrada
  { path: '**', redirectTo: '/home' }
];