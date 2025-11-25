import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-deviaje-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container access-denied-container">
      <div class="card shadow-sm border-0">
        <div class="card-body text-center py-5">
          <div class="icon-container mb-4">
            <i class="bi bi-shield-lock text-danger display-1"></i>
          </div>
          <h1 class="card-title fw-bold text-danger">Acceso Denegado</h1>
          <p class="card-text fs-5 mb-4">
            No tienes permisos para acceder a esta sección.
          </p>
          <p class="text-muted mb-4">
            {{ userMessage }}
          </p>
          <div class="d-flex justify-content-center gap-3">
            <button class="btn btn-outline-secondary" (click)="goBack()">
              <i class="bi bi-arrow-left me-2"></i> Volver
            </button>
            <button class="btn btn-primary" (click)="goHome()">
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .access-denied-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100vh - 80px);
        padding: 2rem;
      }

      .card {
        max-width: 600px;
        border-radius: 1rem;
      }

      .icon-container {
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class DeviajeAccessDeniedComponent {
  userMessage: string = '';
  hasMultipleRoles: boolean = false;

  constructor(private router: Router, private authService: AuthService) {
    this.checkUserStatus();
  }

  checkUserStatus(): void {
    const user = this.authService.currentUser.subscribe((user) => {
      if (user) {
        this.hasMultipleRoles = user.roles.length > 1;

        if (this.hasMultipleRoles) {
          this.userMessage =
            'Parece que estás intentando acceder a una sección con un rol diferente. ' +
            'Puedes cambiar a otro rol si necesitas acceder a esta funcionalidad.';
        } else {
          this.userMessage =
            'Tu rol actual no tiene permisos para acceder a esta funcionalidad. ' +
            'Si crees que deberías tener acceso, contacta al administrador.';
        }
      } else {
        this.userMessage = 'Debes iniciar sesión para acceder a esta sección.';
      }
    });
  }

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
    // El home es el mismo para todos los roles
    this.router.navigate(['/home']);
  }
}
