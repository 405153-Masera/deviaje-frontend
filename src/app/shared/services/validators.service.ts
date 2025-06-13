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
}
