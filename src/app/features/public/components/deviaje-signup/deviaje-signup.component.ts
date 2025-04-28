import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Router } from '@angular/router';
import { SignupRequest } from '../../../../core/auth/models/jwt-models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-deviaje-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-signup.component.html',
  styleUrl: './deviaje-signup.component.css'
})
export class DeviajeSignupComponent {

  signupForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.signupForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(40)]],
      confirmPassword: ['', Validators.required],
      firstName: [''],
      lastName: [''],
      phone: [''],
      birthDate: [''],
      dni: [''],
      dniTypeId: [null]
    }, {
      validator: this.mustMatch('password', 'confirmPassword')
    });
    
    // Redirigir si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
  }

  get f() { return this.signupForm.controls; }

  // Validador personalizado para confirmar que las contraseñas coinciden
  mustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        // Retornar si otro validador ya ha encontrado un error
        return;
      }

      // Establecer error si las contraseñas no coinciden
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
      } else {
        matchingControl.setErrors(null);
      }
    };
  }

  onSubmit(): void {
    this.submitted = true;

    // Detener si el formulario es inválido
    if (this.signupForm.invalid) {
      return;
    }

    this.loading = true;
    
    const signupRequest: SignupRequest = {
      username: this.f['username'].value,
      email: this.f['email'].value,
      password: this.f['password'].value,
      firstName: this.f['firstName'].value,
      lastName: this.f['lastName'].value,
      phone: this.f['phone'].value,
      birthDate: this.f['birthDate'].value ? new Date(this.f['birthDate'].value) : undefined,
      dni: this.f['dni'].value,
      dniTypeId: this.f['dniTypeId'].value
    };

    this.authService.signup(signupRequest)
      .subscribe({
        next: response => {
          this.success = response.message || 'Registro exitoso. Ahora puedes iniciar sesión.';
          this.error = '';
          this.loading = false;
          
          // Redirigir a la página de login después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: error => {
          this.error = error?.error?.message || 'Error en el registro. Por favor, inténtalo de nuevo.';
          this.success = '';
          this.loading = false;
        }
      });
  }
}
