import { Routes } from '@angular/router';
import { DeviajeMainLayoutComponent } from './shared/components/deviaje-main-layout/deviaje-main-layout.component';
import { DeviajeFlightsSearchComponent } from './features/public/components/deviaje-flights-search/deviaje-flights-search.component';
import { DeviajeFlightResultsComponent } from './features/public/components/deviaje-flight-results/deviaje-flight-results.component';
import { DeviajeHotelsSearchComponent } from './features/public/components/hotels/deviaje-hotels-search/deviaje-hotels-search.component';
import { DeviajeHotelsResultsComponent } from './features/public/components/hotels/deviaje-hotels-results/deviaje-hotels-results.component';

export const routes: Routes = [

  // Ruta principal
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  //{ path: 'home', component: DeviajeMainLayoutComponent },
  // Rutas públicas
  //{ path: 'login', component: LoginComponent },
  //{ path: 'home', component: HomeComponent },
  {
    path: 'home',
    component: DeviajeMainLayoutComponent,
    children: [
      { path: 'flight/search', component: DeviajeFlightsSearchComponent },
      { path: 'flight/results', component: DeviajeFlightResultsComponent },
      { path: 'hotels/search', component: DeviajeHotelsSearchComponent },
      { path: 'hotels/results', component: DeviajeHotelsResultsComponent }
    ]
  },


  // Ruta de página no encontrada
  { path: '**', redirectTo: '/home' }
];