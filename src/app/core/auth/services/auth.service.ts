import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../shared/enviroments/enviroment';
import { Router } from '@angular/router';
import {
  ForgotPasswordRequest,
  JwtResponse,
  LoginRequest,
  MessageResponse,
  ResetPasswordRequest,
  SignupRequest,
} from '../models/jwt-models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly router: Router = inject(Router);

  private apiUrl = `${environment.apiDeviajeAuth}`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();
  private tokenExpirationTimer: any;

  constructor() {
    this.loadStoredUser();
  }

  signup(signupRequest: SignupRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/signup`,
      signupRequest
    );
  }

  //Carga al usuario desde el local storage
  private loadStoredUser(): void {
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      const expirationDate = localStorage.getItem('expiration');

      if (user && token && expirationDate) {
        const parsedUser = JSON.parse(user);
        const expirationTime =
          new Date(expirationDate).getTime() - new Date().getTime();

        if (expirationTime > 0) {
          this.currentUserSubject.next(parsedUser);
          this.autoLogout(expirationTime);
        } else {
          this.logout();
        }
      }
    }
  }

  login(loginRequest: LoginRequest): Observable<JwtResponse> {
    return this.http
      .post<JwtResponse>(`${this.apiUrl}/login`, loginRequest)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  logout(): Observable<MessageResponse> {
    if (this.currentUserSubject.value) {
      return this.http.post<MessageResponse>(`${this.apiUrl}/logout`, {}).pipe(
        tap(() => this.clearSession()), // el operador tap, que ejecuta una acción secundaria sin modificar la respuesta.
        catchError((error) => {
          this.clearSession();
          return of({ message: 'Sesión cerrada localmente' });
        })
      );
    } else {
      this.clearSession();
      return of({ message: 'Sesión cerrada' });
    }
  }

  forgotPassword(
    forgotPasswordRequest: ForgotPasswordRequest
  ): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/forgot-password`,
      forgotPasswordRequest
    );
  }

  resetPassword(
    resetPasswordRequest: ResetPasswordRequest
  ): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/reset-password`,
      resetPasswordRequest
    );
  }

  private clearSession(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiration');
    this.currentUserSubject.next(null);

    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = null;

    this.router.navigate(['/home']);
  }

  private handleAuthentication(jwtResponse: JwtResponse): void {
    const expirationDate = new Date(new Date().getTime() + 3600 * 1000); //1 hora de duracion

    localStorage.setItem('token', jwtResponse.token);
    localStorage.setItem('refreshToken', jwtResponse.refreshToken);
    localStorage.setItem('expiration', expirationDate.toISOString());

    const user = {
      id: jwtResponse.id,
      username: jwtResponse.username,
      email: jwtResponse.email,
      roles: jwtResponse.roles,
    };

    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);

    this.autoLogout(3600 * 1000);
  }

  private autoLogout(expirationDuration: number): void {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout().subscribe();
    }, expirationDuration);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user || !user.roles) {
      return false;
    }
    return user.roles.includes(role);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
