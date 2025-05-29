import { Component, OnInit, inject } from '@angular/core';
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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-deviaje-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './deviaje-reset-password.component.html',
  styleUrls: ['./deviaje-reset-password.component.scss'],
})
export class DeviajeResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private passwordResetService = inject(PasswordResetService);

  resetPasswordForm: FormGroup = this.fb.group(
    {
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

  token: string = '';
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  resetComplete = false;
  showNewPassword = false;
  showConfirmPassword = false;
  passwordStrength = 0;

  ngOnInit(): void {
    // Obtener el token de la URL
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'];
      if (!this.token) {
        this.errorMessage = 'Token de restablecimiento no válido o expirado.';
      }
    });

    this.resetPasswordForm
          .get('newPassword')
          ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
          .subscribe((password) => {
            this.calculatePasswordStrength(password);
          });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const newPassword = this.resetPasswordForm.get('newPassword')?.value;
    const confirmPassword =
      this.resetPasswordForm.get('confirmPassword')?.value;

    this.passwordResetService
      .resetPassword(this.token, newPassword, confirmPassword)
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.resetComplete = true;
          this.successMessage =
            'Su contraseña ha sido restablecida exitosamente.';

          // Redirigir al login después de unos segundos
          setTimeout(() => {
            this.router.navigate(['/user/login']);
          }, 3000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage =
            error?.error?.message ||
            'Ocurrió un error al restablecer su contraseña.';
        },
      });
  }

  get f() {
    return this.resetPasswordForm.controls;
  }

  validatePasswordComplexity(
    control: AbstractControl
  ): ValidationErrors | null {
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

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  // Helper methods para mostrar errores
  shouldShowError(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.resetPasswordForm.get(fieldName);
    return field ? field.errors : null;
  }

  onValidate(fieldName: string) {
    const control = this.resetPasswordForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid,
    };
  }
}
