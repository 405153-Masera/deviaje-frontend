import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { SignupRequest } from '../../../../core/auth/models/jwt-models';
import { CommonModule } from '@angular/common';
import { ValidatorsService } from '../../../../shared/services/validators.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-deviaje-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './deviaje-signup.component.html',
  styleUrl: './deviaje-signup.component.scss',
})
export class DeviajeSignupComponent implements OnInit {
  signupForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';

  // Variables para la contraseña
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength = 0;

  // Opciones para el genero
  genderOptions = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Femenino' },
    { value: 'UNSPECIFIED', label: 'Otro' },
  ];

  // Variables para la fecha de nacimiento
  today = new Date();
  minDate = new Date(
    this.today.getFullYear() - 18,
    this.today.getMonth(),
    this.today.getDate()
  );

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private validatorsService: ValidatorsService
  ) {
    // Redirigir si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  private buildForm(): void {
    this.signupForm = this.formBuilder.group(
      {
        username: this.formBuilder.control('', {
          validators: [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(20),
            this.validatorsService.validateUsername(),
          ],
          nonNullable: true,
          asyncValidators: [this.validatorsService.validateUniqueUsername()],
        }),
        email: this.formBuilder.control('', {
          validators: [
            Validators.required,
            Validators.email,
            this.validatorsService.emailWithDomain(),
            Validators.maxLength(80),
          ],
          nonNullable: true,
          asyncValidators: [this.validatorsService.validateUniqueEmail()],
        }),
        password: this.formBuilder.control('', {
          validators: [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(30),
            this.validatePasswordComplexity,
          ],
          nonNullable: true,
        }),
        confirmPassword: this.formBuilder.control('', {
          validators: [Validators.required],
          nonNullable: true,
        }),
      },
      {
        validators: this.mustMatch('password', 'confirmPassword'),
      }
    );
  }

  trimField(fieldName: string): void {
    const control = this.signupForm.get(fieldName);
    if (control && typeof control.value === 'string') {
      control.setValue(control.value.trim());
    }
  }
  ngOnInit(): void {
    this.buildForm();

    this.validatorsService.autoLowercaseControl(this.signupForm.get('email'));

    this.signupForm
      .get('password')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((password) => {
        this.calculatePasswordStrength(password);
      });

    this.signupForm.get('password')?.valueChanges.subscribe(() => {
      const confirmPasswordControl = this.signupForm.get('confirmPassword');
      if (confirmPasswordControl?.value) {
        confirmPasswordControl.updateValueAndValidity();
      }
    });
  }

  get f() {
    return this.signupForm.controls;
  }

  // Helper methods para mostrar errores
  shouldShowError(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(
      field &&
      field.invalid &&
      (field.dirty || field.touched || this.submitted)
    );
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.signupForm.get(fieldName);
    return field ? field.errors : null;
  }

  onValidate(fieldName: string) {
    const control = this.signupForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid,
    };
  }

  onSubmit(): void {
    this.submitted = true;

    this.markFormGroupTouched(this.signupForm);

    // Detener si el formulario es inválido
    if (this.signupForm.invalid) {
      return;
    }

    this.loading = true;

    const signupRequest: SignupRequest = {
      username: this.f['username'].value,
      email: this.f['email'].value,
      password: this.f['password'].value,
    };

    this.authService.signup(signupRequest).subscribe({
      next: (response) => {
        this.success =
          response.message || 'Registro exitoso. Ahora puedes iniciar sesión.';
        this.error = '';
        this.loading = false;

        // Redirigir a la página de login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/user/login']);
        }, 2000);
      },
      error: (error) => {
        this.error =
          error?.error?.message ||
          'Error en el registro. Por favor, inténtalo de nuevo.';
        this.success = '';
        this.loading = false;
      },
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  //Validaciones para el formulario

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

  validateAge(control: AbstractControl): ValidationErrors | null {
    const birthDate = control.value;

    if (!birthDate) return null;

    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      return { underage: true, age: age - 1 };
    }

    if (age < 18) {
      return { underage: true, age: age };
    }

    return null;
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

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }
}
