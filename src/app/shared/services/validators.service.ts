import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { map, of } from 'rxjs';
import { environment } from '../enviroments/enviroment';
import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
} from '@angular/forms';

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

  checkPassportAvailability(passportNumber: string): Observable<boolean> {
    if (!passportNumber) {
      return of(true);
    }

    return this.http
      .get<{ isUnique: boolean }>(
        `${this.apiUrl}/passportNumber?passportNumber=${encodeURIComponent(
          passportNumber
        )}`
      )
      .pipe(map((response) => response.isUnique));
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
          map((response) => (response.isUnique ? null : { passportTaken: true })),
          catchError(() => {
            return of({ serverError: true });
          })
        );
    };
  }
}
