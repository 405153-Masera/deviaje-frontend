import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn,
} from '@angular/forms';
import { Subscription, Observable, of } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { UserData, UserService } from '../../services/user.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ValidatorsService } from '../../services/validators.service';
import { CountryService } from '../../services/country.service';
import { ChangeEmailModalComponent } from '../change-email-modal/change-email-modal.component';
import { ChangePasswordModalComponent } from '../change-password-modal/change-password-modal.component';

interface Country {
  name: string;
  cca2: string;
  phoneCode: string;
  displayCode: string;
}

@Component({
  selector: 'app-deviaje-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    ChangeEmailModalComponent,
    ChangePasswordModalComponent,
  ],
  templateUrl: './deviaje-user-profile.component.html',
  styleUrl: './deviaje-user-profile.component.scss',
})
export class DeviajeUserProfileComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private validatorsService = inject(ValidatorsService);
  private countryService = inject(CountryService);

  // Estado del componente
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  currentUser: UserData | null = null;
  profileForm!: FormGroup;
  subscription = new Subscription();

  // Datos para los selects
  countries: Country[] = [];
  genderOptions = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Femenino' },
    { value: 'UNSPECIFIED', label: 'Otro' },
  ];

  // Modales
  showEmailModal = false;
  showPasswordModal = false;

  // Mensajes
  successMessage = '';
  errorMessage = '';

  // Fechas
  today = new Date();
  maxBirthDate = new Date(
    this.today.getFullYear() - 18,
    this.today.getMonth(),
    this.today.getDate()
  );

  ngOnInit(): void {
    this.loadCountries();
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadUserProfile(): void {
    this.isLoading = true;

    this.subscription.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          if (user) {
            // Cargar datos completos del usuario por username
            this.userService.getUserByUsername(user.username).subscribe({
              next: (userData) => {
                this.currentUser = userData;
                this.buildForm();
                this.isLoading = false;
              },
              error: (error) => {
                this.errorMessage = 'Error al cargar el perfil';
                this.isLoading = false;
              },
            });
          } else {
            this.errorMessage = 'Usuario no autenticado';
            this.isLoading = false;
          }
        },
        error: (error) => {
          this.errorMessage = 'Error al obtener usuario actual';
          this.isLoading = false;
        },
      })
    );
  }

  loadCountries(): void {
    this.subscription.add(
      this.countryService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
        },
        error: (error) => {
          console.error('Error loading countries:', error);
        },
      })
    );
  }

  buildForm(): void {
    if (!this.currentUser) return;

    this.profileForm = this.fb.group({
      firstName: [
        this.currentUser.firstName || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          this.validatorsService.onlyLetters(),
        ],
      ],
      lastName: [
        this.currentUser.lastName || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          this.validatorsService.onlyLetters(),
        ],
      ],
      username: [
        this.currentUser.username,
        {
          validators: [
            Validators.required,
            this.validatorsService.validateUsername(),
          ],
          asyncValidators: [this.conditionalUsernameValidator()],
        },
      ],
      gender: [this.currentUser.gender || ''],
      birthDate: [
        this.currentUser.birthDate || '',
        [this.validateAge.bind(this)],
      ],
      countryCallingCode: [this.currentUser.countryCallingCode || ''],
      phone: [this.currentUser.phone || ''],
      // Datos del pasaporte
      passportNumber: [
        this.currentUser.passport?.passportNumber || '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(9),
          Validators.pattern(/^[A-Z0-9]+$/i),
        ],
        [this.conditionalPassportValidator()], // asyncValidators separados
      ],
      passportExpiryDate: [
        this.currentUser.passport?.expiryDate || '',
        [Validators.required, this.futureDateValidator()],
      ],
      passportIssuanceCountry: [
        this.currentUser.passport?.issuanceCountry || '',
        [Validators.required],
      ],
      passportNationality: [
        this.currentUser.passport?.nationality || '',
        [Validators.required],
      ],
    });

    // Configurar validación de teléfono
    this.setupPhoneValidation();

    // Auto-uppercase para pasaporte
    this.validatorsService.autoUppercaseControl(
      this.profileForm.get('passportNumber')
    );
  }

  formatDateForInput(date: Date): string {
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  setupPhoneValidation(): void {
    const phoneControl = this.profileForm.get('phone');
    const countryCodeControl = this.profileForm.get('countryCallingCode');

    if (phoneControl && countryCodeControl) {
      phoneControl.setValidators([
        Validators.required,
        this.validatorsService.validatePhoneNumber(),
      ]);

      countryCodeControl.setValidators([Validators.required]);
      // Revalidar cuando cambie el código de país
      this.subscription.add(
        countryCodeControl.valueChanges.subscribe(() => {
          phoneControl.updateValueAndValidity();
          phoneControl.markAsTouched();
        })
      );
      phoneControl.updateValueAndValidity();
      countryCodeControl.updateValueAndValidity();
    }
  }

  // Validadores condicionales para evitar validar contra uno mismo
  conditionalUsernameValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!this.currentUser) {
        return of(null);
      }

      // Comparar ambos en minúsculas
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

  conditionalPassportValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (
        !this.currentUser?.passport ||
        control.value === this.currentUser.passport.passportNumber
      ) {
        return of(null);
      }
      const validator = this.validatorsService.validateUniquePassport();

      const result = validator(control);

      // Asegurarse de que siempre retorne un Observable
      if (result instanceof Observable) {
        return result;
      }
      return of(result);
    };
  }

  // Validador de edad (mayor de 18 años)
  validateAge(control: AbstractControl): ValidationErrors | null {
    const birthDate = control.value;
    if (!birthDate) return null;

    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age >= 18 ? null : { underage: true };
  }

  // Validador de fecha futura
  futureDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(control.value);

      if (selectedDate <= today) {
        return { pastDate: true };
      }
      return null;
    };
  }

  // Métodos de control del modo edición
  enableEditMode(): void {
    this.isEditMode = true;
    this.clearMessages();
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.buildForm(); // Recargar datos originales
    this.clearMessages();
  }

  // Guardar cambios del perfil (excepto email y password)
  onSubmit(): void {
    if (this.profileForm.invalid || !this.currentUser) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.isSaving = true;
    this.clearMessages();

    const updateData = {
      firstName: this.profileForm.value.firstName || null,
      lastName: this.profileForm.value.lastName || null,
      username: this.profileForm.value.username,
      gender: this.profileForm.value.gender || null,
      birthDate: this.profileForm.value.birthDate || null,
      countryCallingCode: this.profileForm.value.countryCallingCode || null,
      phone: this.profileForm.value.phone || null,
      passport: {
        passportNumber: this.profileForm.value.passportNumber || null,
        expiryDate: this.profileForm.value.passportExpiryDate || null,
        issuanceCountry: this.profileForm.value.passportIssuanceCountry || null,
        nationality: this.profileForm.value.passportNationality || null,
      },
    };

    this.subscription.add(
      this.userService.updateUser(this.currentUser.id, updateData).subscribe({
        next: (response) => {
          this.successMessage = 'Perfil actualizado correctamente';
          this.isEditMode = false;
          this.isSaving = false;

          this.authService.refreshCurrentUser();
          window.scrollTo({ top: 0, behavior: 'smooth' }); 
        },
        error: (error) => {
          this.errorMessage = 'Error al actualizar el perfil';
          this.isSaving = false;
        },
      })
    );
  }

  // Métodos para modales
  openEmailModal(): void {
    this.showEmailModal = true;
    this.clearMessages();
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
  }

  onEmailChanged(newEmail: string): void {
    this.successMessage = `Email actualizado correctamente a: ${newEmail}`;
    this.loadUserProfile(); // Recargar datos actualizados
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.clearMessages();
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  // Métodos de utilidad
  trimField(fieldName: string): void {
    const control = this.profileForm.get(fieldName);
    if (control && typeof control.value === 'string') {
      control.setValue(control.value.trim());
    }
  }

  onValidate(fieldName: string) {
    const control = this.profileForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid,
    };
  }

  shouldShowError(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.profileForm.get(fieldName);
    return field ? field.errors : null;
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

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Getters para acceso fácil en template
  get f() {
    return this.profileForm.controls;
  }

  get hasPassportData(): boolean {
    return !!(
      this.currentUser?.passport?.passportNumber ||
      this.profileForm.value.passportNumber
    );
  }
}
