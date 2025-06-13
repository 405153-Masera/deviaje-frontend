import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ValidatorsService } from '../../../../shared/services/validators.service';
import {
  UserRegistrationRequest,
  UserService,
} from '../../../../shared/services/user.service';

@Component({
  selector: 'app-deviaje-admin-user-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './deviaje-admin-user-register.component.html',
  styleUrl: './deviaje-admin-user-register.component.scss',
})
export class DeviajeAdminUserRegisterComponent implements OnInit, OnDestroy {
  userForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';
  private subscription = new Subscription();

  // Variables para la contraseña
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength = 0;

  // Opciones para roles
  roleOptions = [
    { value: 'ADMINISTRADOR', label: 'Administrador', id: 1 },
    { value: 'AGENTE', label: 'Agente', id: 2 },
    { value: 'CLIENTE', label: 'Cliente', id: 3 }, 
  ];
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private validatorsService: ValidatorsService
  ) {
    // Verificar que el usuario sea administrador
    if (!this.authService.hasRole('ADMINISTRADOR')) {
      this.router.navigate(['/access-denied']);
    }
  }

  ngOnInit(): void {
    this.buildForm();

    this.userForm
      .get('password')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((password) => {
        this.calculatePasswordStrength(password);
      });

    this.userForm.get('password')?.valueChanges.subscribe(() => {
      const confirmPasswordControl = this.userForm.get('confirmPassword');
      if (confirmPasswordControl?.value) {
        confirmPasswordControl.updateValueAndValidity();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private buildForm(): void {
    this.userForm = this.formBuilder.group(
      {
        username: this.formBuilder.control('', {
          validators: [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
          ],
          nonNullable: true,
          asyncValidators: [this.validatorsService.validateUniqueUsername()],
        }),
        email: this.formBuilder.control('', {
          validators: [Validators.required, Validators.email],
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
        firstName: this.formBuilder.control<string | null>(null),
        lastName: this.formBuilder.control<string | null>(null),
        roles: this.formBuilder.control<string[]>([], {
          validators: [Validators.required],
          nonNullable: true,
        }),
      },
      {
        validators: this.mustMatch('password', 'confirmPassword'),
      }
    );
  }

  private convertRolesToIds(roleNames: string[]): number[] {
    return roleNames
      .map((roleName) => {
        const role = this.roleOptions.find(
          (option) => option.value === roleName
        );
        return role ? role.id : 0;
      })
      .filter((id) => id > 0);
  }

  // Getters para fácil acceso a los controles del formulario
  get f() {
    return this.userForm.controls;
  }

  // Helper methods para mostrar errores (copiado exacto del signup)
  shouldShowError(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(
      field &&
      field.invalid &&
      (field.dirty || field.touched || this.submitted)
    );
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.userForm.get(fieldName);
    return field ? field.errors : null;
  }

  onValidate(fieldName: string) {
    const control = this.userForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid,
    };
  }

  // Validaciones copiadas exactamente del signup
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

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Manejo de roles
  onRoleChange(role: string, event: any): void {
    const roles = this.userForm.get('roles')?.value || [];

    if (event.target.checked) {
      if (!roles.includes(role)) {
        this.userForm.get('roles')?.setValue([...roles, role]);
      }
    } else {
      this.userForm
        .get('roles')
        ?.setValue(roles.filter((r: string) => r !== role));
    }
  }

  isRoleSelected(role: string): boolean {
    const roles = this.userForm.get('roles')?.value || [];
    return roles.includes(role);
  }

  onSubmit(): void {
    this.submitted = true;
    this.markFormGroupTouched(this.userForm);

    // Detener si el formulario es inválido
    if (this.userForm.invalid) {
      return;
    }

    this.loading = true;

    const roleIds = this.convertRolesToIds(this.f['roles'].value); // ← AQUÍ SE LLAMA
    const currentUserId = this.authService.getUser()?.id || 1;

    const userData: UserRegistrationRequest = {
      username: this.f['username'].value,
      email: this.f['email'].value,
      password: this.f['password'].value,
      firstName: this.f['firstName'].value || undefined,
      lastName: this.f['lastName'].value || undefined,
      roleIds: roleIds, // ← Y AQUÍ SE USA EL RESULTADO
      createdUser: currentUserId,
    };

    this.subscription.add(
      this.userService.registerUser(userData).subscribe({
        next: (response) => {
          this.success =
            response.message ||
            'Usuario registrado exitosamente. Se envió un email para cambiar la contraseña.';
          this.error = '';
          this.loading = false;
          this.userForm.reset();
          this.submitted = false;

          // Opcionalmente redirigir a la lista de usuarios después de un tiempo
          setTimeout(() => {
            this.router.navigate(['/admin/users/list']);
          }, 3000);
        },
        error: (error) => {
          this.error =
            error?.error?.message ||
            'Error al registrar el usuario. Por favor, inténtalo de nuevo.';
          this.success = '';
          this.loading = false;
        },
      })
    );
  }

  // Volver a la lista de usuarios
  goBack(): void {
    this.router.navigate(['/admin/users/list']);
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
}
