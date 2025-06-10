import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'deviaje-frontend';

  private authService = inject(AuthService);

  ngOnInit(): void {
    // Forzar carga del usuario al inicializar la app
    // Esto asegura que el estado se cargue antes de que los componentes se rendericen
  }
}
