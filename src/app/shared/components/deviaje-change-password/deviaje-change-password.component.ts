import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { ChangePasswordRequest, UserService } from '../../services/user.service';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-deviaje-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './deviaje-change-password.component.html',
  styleUrls: ['./deviaje-change-password.component.scss'],
})
export class DeviajeChangePasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  changePasswordForm: FormGroup = this.fb.group(
    {
      currentPassword: this.fb.control('', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      newPassword: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(30),
          this.validatePasswordComplexity,
        ],
        nonNullable: true,
      }),
      confirmPassword: this.fb.control('', {
        validators: [Validators.required],
        nonNullable: true,
      }),
    },
    { validators: this.mustMatch('newPassword', 'confirmPassword') }
  );

  // Variables para manejar el token (cambio forzado por administrador)
  token: string = '';
  isTokenReset = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  changeComplete = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  passwordStrength = 0;
  private subscription = new Subscription();

  ngOnInit(): void {
    // Verificar si viene con token (cambio forzado)
    this.subscription.add(
      this.route.queryParams.subscribe((params) => {
        this.token = params['token'];
        if (this.token) {
          this.isTokenReset = true;
          // Si es cambio forzado, no necesita contraseña actual
          this.changePasswordForm.removeControl('currentPassword');
        }
      })
    );

    // Configurar seguimiento de fuerza de contraseña
    this.subscription.add(
      this.changePasswordForm
        .get('newPassword')
        ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((password) => {
          this.calculatePasswordStrength(password);
        }) || new Subscription()
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const passwordData: ChangePasswordRequest = {
      newPassword: this.changePasswordForm.get('newPassword')?.value,
      confirmPassword: this.changePasswordForm.get('confirmPassword')?.value,
    };

    // Si es cambio normal (usuario logueado), incluir contraseña actual
    if (!this.isTokenReset) {
      passwordData.currentPassword = this.changePasswordForm.get('currentPassword')?.value;
    } else {
      // Si es cambio forzado, incluir token
      passwordData.token = this.token;
    }

    // Usar el método apropiado según el tipo de cambio
    const changeRequest = this.isTokenReset 
      ? this.userService.resetPassword(passwordData)
      : this.userService.changePassword(passwordData);

    this.subscription.add(
      changeRequest.subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.changeComplete = true;
          this.successMessage = response.message || 'Su contraseña ha sido cambiada exitosamente.';

          // Redirigir después de un tiempo
          setTimeout(() => {
            if (this.isTokenReset) {
              // Si era cambio forzado, ir al login
              this.authService.logout().subscribe(() => {
                this.router.navigate(['/user/login']);
              });
            } else {
              // Si era cambio normal, ir al perfil
              this.router.navigate(['/profile']);
            }
          }, 3000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error?.error?.message || 'Ocurrió un error al cambiar su contraseña.';
        },
      })
    );
  }

  get f() {
    return this.changePasswordForm.controls;
  }

  // Validaciones copiadas exactamente del signup
  validatePasswordComplexity(control: AbstractControl): ValidationErrors | null {
    const password = control.value;

    if (!password) return null;

    const errors: ValidationErrors = {};

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNoWhitespace = !/\s/.test(password);

    if (!hasUpperCase) errors['noUppercase'] = true;
    if (!hasLowerCase) errors['noLowercase'] = true;
    if (!hasDigit) errors['noDigit'] = true;
    if (!hasSpecialChar) errors['noSpecialChar'] = true;
    if (!hasNoWhitespace) errors['hasWhitespace'] = true;

    return Object.keys(errors).length > 0 ? errors : null;
  }

  mustMatch(controlName: string, matchingControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const control = formGroup.get(controlName);
      const matchingControl = formGroup.get(matchingControlName);

      if (!control || !matchingControl) {
        return null;
      }

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        return null;
      }

      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({
          ...matchingControl.errors,
          mustMatch: true,
        });
        return { mustMatch: true };
      } else {
        // Limpiar solo el error mustMatch, preservar otros errores
        if (matchingControl.errors) {
          delete matchingControl.errors['mustMatch'];
          if (Object.keys(matchingControl.errors).length === 0) {
            matchingControl.setErrors(null);
          }
        }
        return null;
      }
    };
  }

  calculatePasswordStrength(password: string) {
    if (!password) {
      this.passwordStrength = 0;
      return;
    }

    let strength = 0;

    strength += Math.min(password.length * 2, 25);

    if (/[A-Z]/.test(password)) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/\d/.test(password)) strength += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;

    const uniqueChars = new Set(password).size;
    strength += Math.min(uniqueChars * 2, 15);

    this.passwordStrength = Math.min(strength, 100);
  }

  getPasswordStrengthLabel(): string {
    if (this.passwordStrength < 30) return 'Muy débil';
    if (this.passwordStrength < 50) return 'Débil';
    if (this.passwordStrength < 70) return 'Regular';
    if (this.passwordStrength < 90) return 'Fuerte';
    return 'Muy fuerte';
  }

  getPasswordStrengthClass(): string {
    if (this.passwordStrength < 30) return 'bg-danger';
    if (this.passwordStrength < 50) return 'bg-warning';
    if (this.passwordStrength < 70) return 'bg-info';
    if (this.passwordStrength < 90) return 'bg-success';
    return 'bg-success';
  }

  togglePasswordVisibility(field: 'currentPassword' | 'newPassword' | 'confirmPassword') {
    if (field === 'currentPassword') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (field === 'newPassword') {
      this.showNewPassword = !this.showNewPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Helper methods para mostrar errores
  shouldShowError(fieldName: string): boolean {
    const field = this.changePasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.changePasswordForm.get(fieldName);
    return field ? field.errors : null;
  }

  onValidate(fieldName: string) {
    const control = this.changePasswordForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid,
    };
  }

  // Método para volver
  goBack(): void {
    if (this.isTokenReset) {
      this.router.navigate(['/user/login']);
    } else {
      this.router.navigate(['/profile']);
    }
  }
}