// ============================================
// ARCHIVO: deviaje-admin-user-edit.component.ts
// UBICACIÓN: src/app/features/admin/components/deviaje-admin-user-edit/
// ============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  AsyncValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, Observable, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ValidatorsService } from '../../../../shared/services/validators.service';
import {
  UserUpdateRequest,
  UserResponse,
  UserService,
} from '../../../../shared/services/user.service';

@Component({
  selector: 'app-deviaje-admin-user-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './deviaje-admin-user-edit.component.html',
  styleUrl: './deviaje-admin-user-edit.component.scss',
})
export class DeviajeAdminUserEditComponent implements OnInit, OnDestroy {
  editForm!: FormGroup;
  loading = false;
  loadingUser = true;
  submitted = false;
  error = '';
  success = '';
  private subscription = new Subscription();

  userId!: number;
  currentUser: UserResponse | null = null;

  // Opciones para género
  genderOptions = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Femenino' },
    { value: 'UNSPECIFIED', label: 'Otro' },
  ];

  // Opciones para roles
  roleOptions = [
    { value: 'ADMINISTRADOR', label: 'Administrador', id: 1 },
    { value: 'AGENTE', label: 'Agente', id: 2 },
    { value: 'CLIENTE', label: 'Cliente', id: 3 },
  ];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
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
    // Obtener ID del usuario desde la ruta
    this.subscription.add(
      this.route.params.subscribe((params) => {
        this.userId = +params['id'];
        if (this.userId) {
          this.loadUser();
        } else {
          this.error = 'ID de usuario inválido';
          this.loadingUser = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadUser(): void {
    this.loadingUser = true;
    this.subscription.add(
      this.userService.getUserById(this.userId).subscribe({
        next: (user) => {
          this.currentUser = user;
          this.buildForm();
          this.loadingUser = false;
        },
        error: (error) => {
          this.error =
            error?.error?.message || 'Error al cargar el usuario';
          this.loadingUser = false;
        },
      })
    );
  }

  private buildForm(): void {
    if (!this.currentUser) return;

    this.editForm = this.formBuilder.group({
      // CAMPOS SOLO LECTURA (disabled)
      username: [
        { value: this.currentUser.username, disabled: true },
        [Validators.required],
      ],
      email: [
        { value: this.currentUser.email, disabled: true },
        [Validators.required],
      ],
      birthDate: [
        { value: this.currentUser.birthDate, disabled: true },
      ],

      // CAMPOS EDITABLES
      firstName: [
        this.currentUser.firstName,
        [
          Validators.minLength(2),
          Validators.maxLength(50),
          this.validatorsService.onlyLetters(),
          this.validatorsService.noWhitespaceAround(),
        ],
      ],
      lastName: [
        this.currentUser.lastName,
        [
          Validators.minLength(2),
          Validators.maxLength(50),
          this.validatorsService.onlyLetters(),
          this.validatorsService.noWhitespaceAround(),
        ],
      ],
      gender: [this.currentUser.gender],
      phone: [this.currentUser.phone],
      roles: [
        this.currentUser.roles || [],
        [Validators.required],
      ],
    });
  }

  // Validador condicional para username (no validar contra sí mismo)
  conditionalUsernameValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!this.currentUser) {
        return of(null);
      }

      const currentValue = control.value?.toLowerCase().trim();
      const originalValue = this.currentUser.username?.toLowerCase().trim();

      if (currentValue === originalValue) {
        return of(null);
      }

      const validator = this.validatorsService.validateUniqueUsername();
      const result = validator(control);

      if (result instanceof Observable) {
        return result;
      }
      return of(result);
    };
  }

  // Validador condicional para email (no validar contra sí mismo)
  conditionalEmailValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!this.currentUser) {
        return of(null);
      }

      const currentValue = control.value?.toLowerCase().trim();
      const originalValue = this.currentUser.email?.toLowerCase().trim();

      if (currentValue === originalValue) {
        return of(null);
      }

      const validator = this.validatorsService.validateUniqueEmail();
      const result = validator(control);

      if (result instanceof Observable) {
        return result;
      }
      return of(result);
    };
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
    return this.editForm.controls;
  }

  // Helper methods para mostrar errores
  shouldShowError(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(
      field &&
      field.invalid &&
      (field.dirty || field.touched || this.submitted)
    );
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.editForm.get(fieldName);
    return field ? field.errors : null;
  }

  onValidate(fieldName: string) {
    const control = this.editForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid && (control?.dirty || control?.touched),
    };
  }

  // Manejo de roles
  onRoleChange(role: string, event: any): void {
    const roles = this.editForm.get('roles')?.value || [];

    if (event.target.checked) {
      if (!roles.includes(role)) {
        this.editForm.get('roles')?.setValue([...roles, role]);
      }
    } else {
      this.editForm
        .get('roles')
        ?.setValue(roles.filter((r: string) => r !== role));
    }
  }

  isRoleSelected(role: string): boolean {
    const roles = this.editForm.get('roles')?.value || [];
    return roles.includes(role);
  }

  onSubmit(): void {
    this.submitted = true;
    this.markFormGroupTouched(this.editForm);

    // Detener si el formulario es inválido
    if (this.editForm.invalid) {
      return;
    }

    this.loading = true;

    const roleIds = this.convertRolesToIds(this.f['roles'].value);
    const currentUserId = this.authService.getUser()?.id || 1;

    const updateData: UserUpdateRequest = {
      firstName: this.f['firstName'].value || undefined,
      lastName: this.f['lastName'].value || undefined,
      gender: this.f['gender'].value || undefined,
      phone: this.f['phone'].value || undefined,
      roleIds: roleIds,  
      lastUpdatedUser: currentUserId,
    };

    this.subscription.add(
      this.userService.updateUser(this.userId, updateData).subscribe({
        next: (response) => {
          this.success = 'Usuario actualizado exitosamente.';
          this.error = '';
          this.loading = false;

          // Redirigir después de un tiempo
          setTimeout(() => {
            this.router.navigate(['/admin/users/list']);
          }, 2000);
        },
        error: (error) => {
          this.error =
            error?.error?.message ||
            'Error al actualizar el usuario. Por favor, inténtalo de nuevo.';
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