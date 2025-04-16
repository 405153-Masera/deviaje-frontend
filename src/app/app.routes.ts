import { Routes } from '@angular/router';
import { LoginComponent } from './authComponents/login/login.component';
import { HomeComponent } from './common/components/home/home.component';

export const routes: Routes = [
  // Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },


  // Ruta principal
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Ruta de página no encontrada
  { path: '**', redirectTo: '/home' }
];