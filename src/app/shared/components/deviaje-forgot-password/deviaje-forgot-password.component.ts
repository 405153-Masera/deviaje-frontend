import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset.service';

@Component({
  selector: 'app-deviaje-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './deviaje-forgot-password.component.html',
  styleUrls: ['./deviaje-forgot-password.component.scss']
})
export class DeviajeForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly passwordResetService = inject(PasswordResetService);
  private readonly router = inject(Router);

  forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const email = this.forgotPasswordForm.get('email')?.value;

    this.passwordResetService.forgotPassword(email).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        console.log('Respuesta del servidor:', response);
        if (response.success === false) {
          this.errorMessage = response.message || 'Ocurrió un error al enviar el correo electrónico.';
          return;
        } else {
          this.successMessage = 'Se ha enviado un correo electrónico con instrucciones para restablecer su contraseña.';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error?.error?.message || 'Ocurrió un error al procesar su solicitud.';
      }
    });
  }
}