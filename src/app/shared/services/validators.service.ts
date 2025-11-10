import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { map, of } from 'rxjs';
import { environment } from '../enviroments/enviroment';
import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { isValidPhoneNumber } from 'libphonenumber-js';

@Injectable({
  providedIn: 'root',
})
export class ValidatorsService {
  private readonly http: HttpClient = inject(HttpClient);
  private apiUrl = environment.apiDeviajeValidation;

  validateUniqueUsername(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const username = control.value;
      if (!username || username.length < 3) {
        return of(null);
      }

      return this.http
        .get<{ isUnique: boolean }>(
          `${this.apiUrl}/username?username=${control.value}`
        )
        .pipe(
          map((response) =>
            response.isUnique ? null : { usernameTaken: true }
          ),
          catchError(() => {
            return of({ serverError: true });
          })
        );
    };
  }

  validateUniqueEmail(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const email = control.value;

      // Si no hay valor o no es un email válido, no validamos contra el servidor
      if (!email || !email.includes('@')) {
        return of(null);
      }

      return this.http
        .get<{ isUnique: boolean }>(
          `${this.apiUrl}/email?email=${control.value}`
        )
        .pipe(
          map((response) => (response.isUnique ? null : { emailTaken: true })),
          catchError(() => {
            return of({ serverError: true });
          })
        );
    };
  }

  validateUniquePassport(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const passportNumber = control.value;
      if (!passportNumber) {
        return of(null);
      }

      return this.http
        .get<{ isUnique: boolean }>(
          `${this.apiUrl}/passportNumber?passportNumber=${control.value}`
        )
        .pipe(
          map((response) =>
            response.isUnique ? null : { passportTaken: true }
          ),
          catchError(() => {
            return of({ serverError: true });
          })
        );
    };
  }

  validatePassportFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const passportNumber = control.value;

      if (!passportNumber) {
        return null;
      }

      //Solo alfanuméricos, sin espacios ni guiones
      const passportFormatRegex = /^[A-Za-z0-9]{3,20}$/;
      if (!passportFormatRegex.test(passportNumber)) {
        return { invalidPassportFormat: { value: passportNumber } };
      }

      return null;
    };
  }

  // Versión mejorada más dinámica
  validatePhoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const phoneNumber = control.value;

      if (!phoneNumber) {
        return null;
      }

      // Obtener el código de país del mismo FormGroup
      const parent = control.parent;
      const countryCode = parent?.get('countryCallingCode')?.value;

      if (!countryCode) {
        return { missingCountryCode: true };
      }

      try {
        // Construir el número completo con el código de país
        const fullNumber = `+${countryCode}${phoneNumber}`;

        if (!isValidPhoneNumber(fullNumber)) {
          return { invalidPhoneNumber: { value: phoneNumber } };
        }
      } catch (error) {
        return { phoneValidationError: true };
      }

      return null;
    };
  }

  /**
   * Validador para nombres y apellidos - Solo permite letras, espacios, guiones y apóstrofes
   * Requisito de API Amadeus: No se permiten números en nombres ni apellidos
   *
   * Ejemplo de uso:
   * firstName: ['', [Validators.required, this.validatorsService.onlyLetters()]]
   */
  onlyLetters(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      // Permite letras con tildes, ñ, espacios, guiones y apóstrofes
      // No permite números ni otros caracteres especiales
      const pattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;

      return pattern.test(control.value) ? null : { onlyLetters: true };
    };
  }

  /**
   * Validador para email que requiere dominio completo
   * Requisito de API Amadeus: El email debe tener un dominio válido (ej: .com, .ar, etc.)
   *
   * Valida en pasos para dar mensajes de error específicos:
   * 1. Que tenga @
   * 2. Que tenga un dominio después del @
   * 3. Que el dominio tenga una extensión válida (.com, .ar, etc.)
   *
   * Ejemplo de uso:
   * emailAddress: ['', [Validators.required, Validators.email, this.validatorsService.emailWithDomain()]]
   */
  emailWithDomain(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const email = control.value.trim();

      // 1. Verificar que tenga @
      if (!email.includes('@')) {
        return { missingAt: true };
      }

      // 2. Dividir en usuario y dominio
      const parts = email.split('@');

      // Verificar que no haya múltiples @
      if (parts.length !== 2) {
        return { invalidEmail: true };
      }

      const [username, domain] = parts;

      // 3. Verificar que el usuario no esté vacío
      if (!username || username.length === 0) {
        return { missingUsername: true };
      }

      // 4. Verificar que el dominio no esté vacío
      if (!domain || domain.length === 0) {
        return { missingDomain: true };
      }

      // 5. Verificar que el dominio tenga al menos un punto
      if (!domain.includes('.')) {
        return { missingDomainExtension: true };
      }

      // 6. Verificar el formato completo del email
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailPattern.test(email)) {
        return { invalidEmailFormat: true };
      }

      // 7. Verificar que la extensión del dominio tenga al menos 2 caracteres
      const domainParts = domain.split('.');
      const extension = domainParts[domainParts.length - 1];

      if (extension.length < 2) {
        return { invalidDomainExtension: true };
      }

      return null;
    };
  }

  /**
   * Validador que no permite espacios al inicio o al final
   * También previene que el campo tenga solo espacios
   *
   * Ejemplo de uso:
   * firstName: ['', [Validators.required, this.validatorsService.noWhitespaceAround()]]
   */
  noWhitespaceAround(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value;
      const trimmedValue = value.trim();

      // Si el valor original es diferente al trimmed, hay espacios alrededor
      if (value !== trimmedValue) {
        return { whitespaceAround: true };
      }

      // Si después del trim no queda nada, solo había espacios
      if (trimmedValue.length === 0) {
        return { onlyWhitespace: true };
      }

      return null;
    };
  }

  /**
   * Método helper para obtener mensajes de error en español
   * @param errorKey Clave del error
   * @param errorValue Valor del error (opcional, para mensajes dinámicos)
   *
   * Ejemplo de uso en el componente:
   * getErrorMessage(error: string): string {
   *   return this.validatorsService.getErrorMessage(error);
   * }
   */
  getErrorMessage(errorKey: string, errorValue?: any): string {
    const errorMessages: { [key: string]: string } = {
      required: 'Este campo es obligatorio',
      onlyLetters: 'Solo se permiten letras',

      // Errores de email específicos
      missingAt: 'El email debe contener el símbolo @',
      missingUsername: 'Ingrese un usuario antes del @',
      missingDomain: 'Ingrese un dominio después del @',
      missingDomainExtension:
        'El dominio debe tener una extensión (ej: .com, .ar)',
      invalidDomainExtension:
        'La extensión del dominio debe tener al menos 2 caracteres',
      invalidEmailFormat: 'El formato del email no es válido',
      invalidEmailDomain:
        'El email debe tener un dominio válido (ej: .com, .ar)',
      email: 'Ingrese un email válido',

      // Errores de espacios
      whitespaceAround: 'No se permiten espacios al inicio o al final',
      onlyWhitespace: 'El campo no puede contener solo espacios',

      // Otros errores
      invalidPhoneFormat: 'Formato de teléfono inválido',
      invalidPhoneNumber: 'El número de teléfono no es válido',
      missingCountryCode: 'Seleccione primero el código de país',
      phoneValidationError: 'Error al validar el número de teléfono',
      invalidPassportFormat: 'Formato de pasaporte inválido',
      passportTaken: 'Este número de pasaporte ya está registrado',
      emailTaken: 'Este email ya está registrado',
      usernameTaken: 'Este nombre de usuario ya está en uso',
      serverError: 'Error de servidor, intente nuevamente',
      minLengthLastName: `El apellido debe tener al menos ${
        errorValue?.requiredLength || 2
      } caracteres`,
      minlength: `Mínimo ${errorValue?.requiredLength} caracteres`,
      maxlength: `Máximo ${errorValue?.requiredLength} caracteres`,
      pattern: 'Formato inválido',
    };

    return errorMessages[errorKey] || 'Error de validación';
  }

  /**
   * Método helper para hacer trim automático de un FormControl
   * Llama este método en el ngOnInit o cuando se cree el control
   *
   * Ejemplo de uso:
   * this.validatorsService.autoTrimControl(this.travelerForm.get('firstName'));
   */
  autoTrimControl(control: AbstractControl | null): void {
    if (!control) return;

    control.valueChanges.subscribe((value) => {
      if (value && typeof value === 'string') {
        const trimmedValue = value.trim();
        if (value !== trimmedValue) {
          control.setValue(trimmedValue, { emitEvent: false });
        }
      }
    });
  }

  /**
   * Método helper para convertir automáticamente a mayúsculas
   * Llama este método en el ngOnInit o cuando se cree el control
   *
   * Ejemplo de uso:
   * this.validatorsService.autoUppercaseControl(this.travelerForm.get('firstName'));
   */
  autoUppercaseControl(control: AbstractControl | null): void {
    if (!control) return;

    control.valueChanges.subscribe((value) => {
      if (value && typeof value === 'string') {
        const uppercaseValue = value.toUpperCase();
        if (value !== uppercaseValue) {
          control.setValue(uppercaseValue, { emitEvent: false });
        }
      }
    });
  }
}
