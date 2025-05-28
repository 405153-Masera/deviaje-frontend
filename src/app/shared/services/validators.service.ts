import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, of } from 'rxjs';
import { environment } from '../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class ValidatorsService {

  private readonly http: HttpClient = inject(HttpClient);
  private apiUrl = `${environment.apiDeviajeAuth}/validation`;

  checkUsernameAvailability(username: string): Observable<boolean> {
    if (!username || username.length < 3) {
      return of(true);
    }
    
    return this.http.get<{ isUnique: boolean }>(`${this.apiUrl}/username?username=${encodeURIComponent(username)}`)
      .pipe(map(response => response.isUnique));
  }

  checkEmailAvailability(email: string): Observable<boolean> {
    if (!email || !email.includes('@')) {
      return of(true);
    }
    
    return this.http.get<{ isUnique: boolean }>(`${this.apiUrl}/email?email=${encodeURIComponent(email)}`)
      .pipe(map(response => response.isUnique));
  }


  checkPassportAvailability(passportNumber: string): Observable<boolean> {
    if (!passportNumber) {
      return of(true);
    }
    
    return this.http.get<{ isUnique: boolean }>(`${this.apiUrl}/passportNumber?passportNumber=${encodeURIComponent(passportNumber)}`)
      .pipe(map(response => response.isUnique));
  }
}
