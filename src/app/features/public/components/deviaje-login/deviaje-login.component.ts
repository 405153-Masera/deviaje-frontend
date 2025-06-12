import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { LoginRequest } from '../../../../core/auth/models/jwt-models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-deviaje-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './deviaje-login.component.html',
  styleUrl: './deviaje-login.component.scss',
})
export class DeviajeLoginComponent implements OnInit {
  private readonly formBuilder: FormBuilder = inject(FormBuilder);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private authService: AuthService = inject(AuthService);

  loading = false;
  submitted = false;
  returnUrl: string;
  error = '';
  showPassword = false;

  loginForm: FormGroup = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  // EN TU deviaje-login.component.ts

  constructor() {
    // Obtener la URL de retorno de los parámetros de la ruta
    const returnUrlFromQuery = this.route.snapshot.queryParams['returnUrl'];

    if (returnUrlFromQuery) {
      // Si hay returnUrl en query params, usarlo
      this.returnUrl = returnUrlFromQuery;
      console.log('ReturnUrl desde queryParams:', this.returnUrl);
    } else {
      // Si no hay query params, intentar obtener la URL anterior del historial
      const previousUrl = document.referrer;

      if (previousUrl && previousUrl.includes(window.location.origin)) {
        // Extraer solo la parte de la ruta (sin dominio)
        const url = new URL(previousUrl);
        this.returnUrl = url.pathname;
        console.log('ReturnUrl desde referrer:', this.returnUrl);
      } else {
        // Último fallback
        this.returnUrl = '/home';
        console.log('ReturnUrl fallback:', this.returnUrl);
      }
    }
  }

  ngOnInit(): void {
    // Redirigir si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  // Getter para acceder fácilmente a los campos del formulario
  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    // Detener si el formulario es inválido
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const loginRequest: LoginRequest = {
      username: this.f['username'].value,
      password: this.f['password'].value,
    };

    this.authService.login(loginRequest).subscribe({
      next: () => {
        // Navegar a la página de retorno después del login exitoso
        this.handlePostLoginRedirect();
      },
      error: (error) => {
        this.error =
          'Ocurrió un error al iniciar sesión. Por favor, inténtelo de nuevo más tarde.';
        const messaje = error?.error?.message?.toLowerCase();

        if (messaje?.includes('bad credentials')) {
          this.error = 'Usuario o contraseña incorrectos';
        }
        this.loading = false;
      },
    });
  }

  private handlePostLoginRedirect(): void {
    console.log('🔍 DEBUG - returnUrl:', this.returnUrl);
    console.log('🔍 DEBUG - queryParams:', this.route.snapshot.queryParams);
    console.log('🔍 DEBUG - referrer:', document.referrer);

    const isPublicRoute = this.returnUrl.startsWith('/home');
    console.log('🔍 DEBUG - isPublicRoute:', isPublicRoute);

    if (isPublicRoute) {
      console.log('✅ Volviendo a página pública:', this.returnUrl);
      this.router.navigate([this.returnUrl]);
    } else {
      const user = this.authService.getCurrentUserValue();
      const userRole = user?.activeRole || user?.roles?.[0] || '';
      console.log('🔍 DEBUG - userRole:', userRole);

      if (this.hasPermissionForRoute(this.returnUrl, userRole)) {
        console.log('✅ Usuario tiene permisos para:', this.returnUrl);
        this.router.navigate([this.returnUrl]);
      } else {
        console.log('❌ Usuario sin permisos, redirigiendo al home');
        this.router.navigate(['/home']);
      }
    }
  }
  // AGREGAR este método helper:
  private hasPermissionForRoute(route: string, userRole: string): boolean {
    // Verificar permisos según la ruta
    if (route.includes('/admin')) {
      return userRole === 'ADMINISTRADOR';
    }
    if (route.includes('/agent')) {
      return ['ADMINISTRADOR', 'AGENTE'].includes(userRole);
    }
    if (route.includes('/profile') || route.includes('/bookings')) {
      return ['ADMINISTRADOR', 'AGENTE', 'CLIENTE'].includes(userRole);
    }

    // Por defecto, permitir acceso
    return true;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Helper methods para mostrar errores
  shouldShowError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.loginForm.get(fieldName);
    return field ? field.errors : null;
  }

  onValidate(fieldName: string) {
    const control = this.loginForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid,
    };
  }
}
