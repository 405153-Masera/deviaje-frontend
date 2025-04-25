import { Routes } from '@angular/router';
import { DeviajeMainLayoutComponent } from './shared/components/deviaje-main-layout/deviaje-main-layout.component';
import { DeviajeFlightsSearchComponent } from './features/public/components/deviaje-flights-search/deviaje-flights-search.component';

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
      { path: 'flight-search', component: DeviajeFlightsSearchComponent }
    ]
  },


  // Ruta de página no encontrada
  { path: '**', redirectTo: '/home' }
];