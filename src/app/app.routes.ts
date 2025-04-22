import { Routes } from '@angular/router';
import { DeviajeMainLayoutComponent } from './shared/components/deviaje-main-layout/deviaje-main-layout.component';

export const routes: Routes = [

  // Ruta principal
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: DeviajeMainLayoutComponent },
  // Rutas públicas
  //{ path: 'login', component: LoginComponent },
  //{ path: 'home', component: HomeComponent },


  // Ruta de página no encontrada
  { path: '**', redirectTo: '/home' }
];