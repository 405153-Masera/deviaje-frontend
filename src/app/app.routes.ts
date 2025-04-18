import { Routes } from '@angular/router';
import { HomeComponentComponent } from './shared/components/home-component/home-component.component';

export const routes: Routes = [

  // Ruta principal
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponentComponent },
  // Rutas públicas
  //{ path: 'login', component: LoginComponent },
  //{ path: 'home', component: HomeComponent },


  // Ruta de página no encontrada
  { path: '**', redirectTo: '/home' }
];