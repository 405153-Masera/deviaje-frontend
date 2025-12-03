import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
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
import { Observable, of } from 'rxjs';
import { UserService } from '../../services/user.service';
import { ValidatorsService } from '../../services/validators.service';

@Component({
  selector: 'app-change-email-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-email-modal.component.html',
  styleUrl: './change-email-modal.component.scss',
})
export class ChangeEmailModalComponent implements OnInit {
  @Input() show = false;
  @Input() currentEmail = '';
  @Input() userId!: number;
  @Output() closeModal = new EventEmitter<void>();
  @Output() emailChanged = new EventEmitter<string>();

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private validatorsService = inject(ValidatorsService);

  emailForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  showConfirmation = false;

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.emailForm = this.fb.group({
      newEmail: [
        '',
        {
          validators: [
            Validators.required,
            Validators.email,
            this.validatorsService.emailWithDomain(),
            Validators.maxLength(80),
          ],
          asyncValidators: [this.conditionalEmailValidator()],
        },
      ],
    });

    this.validatorsService.autoLowercaseControl(this.emailForm.get('newEmail'));
  }

  // Validador condicional para email
  conditionalEmailValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      // Si es el mismo email, no validar
      if (
        (control.value ?? '').trim().toLowerCase() ===
        (this.currentEmail ?? '').trim().toLowerCase()
      ) {
        return of({ sameEmail: true });
      }

      if (!control.value || !control.value.includes('@')) {
        return of(null);
      }
      const validator = this.validatorsService.validateUniqueEmail();
      const result = validator(control);

      // Asegurarse de que siempre retorne un Observable
      if (result instanceof Observable) {
        return result;
      }
      return of(result);
    };
  }

  onSubmit(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    // Mostrar modal de confirmación interno
    this.showConfirmation = true;
  }

  confirmChange(): void {
    this.showConfirmation = false;
    this.isSubmitting = true;
    this.errorMessage = '';

    const updateData = {
      email: this.emailForm.value.newEmail,
    };

    this.userService.updateUser(this.userId, updateData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.emailChanged.emit(this.emailForm.value.newEmail);
        this.close();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Error al cambiar el email';
        this.isSubmitting = false;
      },
    });
  }

  cancelConfirmation(): void {
    this.showConfirmation = false;
  }

  close(): void {
    this.emailForm.reset();
    this.errorMessage = '';
    this.closeModal.emit();
  }

  onValidate(fieldName: string) {
    const control = this.emailForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid && (control?.dirty || control?.touched),
    };
  }

  shouldShowError(fieldName: string): boolean {
    const field = this.emailForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.emailForm.get(fieldName);
    return field ? field.errors : null;
  }

  get f() {
    return this.emailForm.controls;
  }

  trimField(fieldPath: string): void {
    const control = this.emailForm.get(fieldPath);
    if (control && control.value && typeof control.value === 'string') {
      const trimmedValue = control.value.trim(); // ← SOLO inicio/final
      if (control.value !== trimmedValue) {
        control.setValue(trimmedValue);
      }
    }
  }
}
