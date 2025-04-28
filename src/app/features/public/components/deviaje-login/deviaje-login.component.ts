import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { LoginRequest } from '../../../../core/auth/models/jwt-models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-deviaje-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-login.component.html',
  styleUrl: './deviaje-login.component.scss'
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

  loginForm: FormGroup = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
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
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    // Detener si el formulario es inválido
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const loginRequest: LoginRequest = {
      username: this.f['username'].value,
      password: this.f['password'].value
    };

    this.authService.login(loginRequest)
      .subscribe({
        next: () => {
          // Navegar a la página de retorno después del login exitoso
          this.router.navigate([this.returnUrl]);
        },
        error: error => {
          this.error = error?.error?.message || 'Usuario o contraseña incorrectos';
          this.loading = false;
        }
      });
  }
}
