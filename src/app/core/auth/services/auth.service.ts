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

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  avatar?: string;
  // Campo para el rol activo actualmente seleccionado
  activeRole?: string;
}

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
      const activeRole = localStorage.getItem('activeRole');

      if (user && token && expirationDate) {
        const parsedUser = JSON.parse(user);

        // Añadir el rol activo si existe
        if (activeRole && parsedUser.roles.includes(activeRole)) {
          parsedUser.activeRole = activeRole;
        } else if (parsedUser.roles.length > 0) {
          // Si no hay rol activo guardado o no es válido, usar el primer rol disponible
          parsedUser.activeRole = this.getHighestPriorityRole(parsedUser.roles);
          localStorage.setItem('activeRole', parsedUser.activeRole);
        }

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

  // Método para cambiar el rol activo del usuario
  switchActiveRole(role: string): void {
    const currentUser = this.currentUserSubject.value;

    if (currentUser && currentUser.roles.includes(role)) {
      currentUser.activeRole = role;
      localStorage.setItem('activeRole', role);
      this.currentUserSubject.next(currentUser);

      // Redirigir a la página principal del rol seleccionado
      this.navigateToRoleHome(role);
    }
  }

  // Método para obtener el rol activo actual
  getActiveRole(): string | null {
    const currentUser = this.currentUserSubject.value;
    return currentUser?.activeRole || null;
  }

  // Método para navegar a la página principal según el rol
  private navigateToRoleHome(role: string): void {
    this.router.navigate(['/home']);
  }

  // Método para obtener el rol de mayor prioridad
  // Método para obtener el rol de mayor prioridad
  private getHighestPriorityRole(roles: string[]): string {
    const priorityOrder = ['ADMINISTRADOR', 'AGENTE', 'CLIENTE'];

    for (const role of priorityOrder) {
      if (roles.includes(role)) {
        return role;
      }
    }

    return roles[0]; // Devolver el primer rol si ninguno coincide con la prioridad
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
    localStorage.removeItem('activeRole');
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

    // Determinar el rol activo basado en la prioridad
    const activeRole = this.getHighestPriorityRole(jwtResponse.roles);
    localStorage.setItem('activeRole', activeRole);

    const user: User = {
      id: jwtResponse.id,
      username: jwtResponse.username,
      email: jwtResponse.email,
      roles: jwtResponse.roles,
      activeRole: activeRole,
    };

    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);

    this.autoLogout(3600 * 1000);

    // Redirigir según el rol activo
    this.navigateToRoleHome(activeRole);
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

  // Método para verificar si el rol activo es uno específico
  isActiveRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user || !user.activeRole) {
      return false;
    }
    return user.activeRole === role;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
