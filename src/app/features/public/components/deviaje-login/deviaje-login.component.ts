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

  constructor() {
    // Obtener la URL de retorno de los parámetros de la ruta o usar la URL por defecto
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
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
        this.router.navigate([this.returnUrl]);
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Helper methods para mostrar errores
  shouldShowError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(
      field &&
      field.invalid &&
      (field.dirty || field.touched)
    );
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.loginForm.get(fieldName);
    return field ? field.errors : null;
  }

   onValidate(fieldName: string) {
    const control = this.loginForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid
    }
  }
}
