import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, tap } from 'rxjs';
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
  activeRole?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly router: Router = inject(Router);

  private apiUrl = `${environment.apiDeviajeAuth}`;
  private tokenExpirationTimer: any;

  // BehaviorSubjects para estado reactivo
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private activeRoleSubject = new BehaviorSubject<string | null>(null);

  // Observables públicos
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public activeRole$ = this.activeRoleSubject.asObservable();

  constructor() {
    this.initializeAuthState();
  }

  // ================== INICIALIZACIÓN ==================

  // Agrega estos logs TEMPORALES en tu AuthService actual:

  private initializeAuthState(): void {
    if (typeof localStorage !== 'undefined') {
      // 1. ¿Qué hay en localStorage?
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');
      const activeRole = localStorage.getItem('activeRole');
      const expiration = localStorage.getItem('expiration');

      // 2. ¿Se puede parsear el usuario?
      let user = null;
      try {
        user = userString ? JSON.parse(userString) : null;
      } catch (e) {
        console.error('❌ Error parseando usuario:', e);
      }

      // 3. ¿El token es válido?
      if (token && user) {
        // Verificar expiración paso a paso
        const expirationDate = expiration ? new Date(expiration) : null;
        const now = new Date();

        const isValid = this.isTokenValid();

        if (isValid) {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          this.activeRoleSubject.next(activeRole);
        } else {
          this.clearSession();
        }
      } else {
        console.log('❌ No hay token o usuario');
        console.log('Token existe:', !!token);
        console.log('Usuario existe:', !!user);
      }
    } else {
      console.log('❌ localStorage no disponible');
    }
  }

  private isTokenValid(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return false;

    return new Date() < expiration;
  }

  // ================== MÉTODOS PRINCIPALES ==================

  signup(signupRequest: SignupRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/signup`,
      signupRequest
    );
  }

  login(loginRequest: LoginRequest): Observable<JwtResponse> {
    return this.http
      .post<JwtResponse>(`${this.apiUrl}/login`, loginRequest)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  logout(): Observable<MessageResponse> {
    if (this.isAuthenticated()) {
      return this.http.post<MessageResponse>(`${this.apiUrl}/logout`, {}).pipe(
        tap(() => this.clearSession()),
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

  // ================== MÉTODOS DE TOKEN ==================

  saveToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  saveRefreshToken(refreshToken: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  getRefreshToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  saveTokenExpiration(expirationDate: Date): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('expiration', expirationDate.toISOString());
    }
  }

  getTokenExpiration(): Date | null {
    if (typeof localStorage !== 'undefined') {
      const expiration = localStorage.getItem('expiration');
      return expiration ? new Date(expiration) : null;
    }
    return null;
  }

  // ================== MÉTODOS DE USUARIO ==================

  saveUser(user: User): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  getUser(): User | null {
    return this.currentUserSubject.value;
  }

  private getStoredUser(): User | null {
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  /**
   * Cambiar rol activo SIN redirigir - solo actualiza la vista
   * @param role Nuevo rol activo
   */
  changeActiveRoleWithoutRedirect(role: string): void {
    const currentUser = this.currentUserSubject.value;

    if (!currentUser || !currentUser.roles.includes(role)) {
      console.error('Usuario no tiene permiso para cambiar a rol:', role);
      return;
    }

    // Actualizar localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('activeRole', role);
    }

    // Actualizar estado reactivo - esto disparará todos los componentes suscritos
    this.activeRoleSubject.next(role);

    console.log(`Rol cambiado a: ${role} (sin redirección)`);
  }

  // ================== MÉTODOS DE ROLES ==================

  saveActiveRole(role: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('activeRole', role);
      this.activeRoleSubject.next(role);

      // También actualizar el usuario guardado
      const user = this.getUser();
      if (user) {
        user.activeRole = role;
        this.saveUser(user);
      }
    }
  }

  getActiveRole(): string | null {
    return this.activeRoleSubject.value;
  }

  switchActiveRole(role: string): void {
    const user = this.getUser();
    if (user && user.roles.includes(role)) {
      this.saveActiveRole(role);
      this.navigateToRoleHome(role);
    }
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user ? user.roles.includes(role) : false;
  }

  isActiveRole(role: string): boolean {
    const activeRole = this.getActiveRole();
    return activeRole === role;
  }

  // También agregar este método helper para los componentes:
  /**
   * Obtener el valor actual del usuario de forma síncrona (para compatibilidad)
   */
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
  // ================== MÉTODOS DE AUTENTICACIÓN ==================

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // ================== MÉTODOS PRIVADOS ==================

  private handleAuthentication(jwtResponse: JwtResponse): void {
    const expirationMs = 24 * 60 * 60 * 1000;
    const expirationDate = new Date(new Date().getTime() + expirationMs); // 1 hora

    // Guardar tokens
    this.saveToken(jwtResponse.token);
    this.saveRefreshToken(jwtResponse.refreshToken);
    this.saveTokenExpiration(expirationDate);

    // Determinar el rol activo basado en la prioridad
    const activeRole = this.getHighestPriorityRole(jwtResponse.roles);
    this.saveActiveRole(activeRole);

    // Crear y guardar usuario
    const user: User = {
      id: jwtResponse.id,
      username: jwtResponse.username,
      email: jwtResponse.email,
      roles: jwtResponse.roles,
      activeRole: activeRole,
    };

    this.saveUser(user);

    // Actualizar estado de autenticación
    this.isAuthenticatedSubject.next(true);

    // Configurar auto-logout
    this.autoLogout(expirationMs);
  }

  private clearSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiration');
      localStorage.removeItem('activeRole');
    }

    // Actualizar estado reactivo
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.activeRoleSubject.next(null);

    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    this.router.navigate(['/home']);
  }

  private checkTokenExpiration(): void {
    const expiration = this.getTokenExpiration();
    if (expiration) {
      const timeUntilExpiration = expiration.getTime() - new Date().getTime();
      if (timeUntilExpiration > 0) {
        this.autoLogout(timeUntilExpiration);
      } else {
        this.clearSession();
      }
    }
  }

  private autoLogout(expirationDuration: number): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    this.tokenExpirationTimer = setTimeout(() => {
      this.logout().subscribe();
    }, expirationDuration);
  }

  private navigateToRoleHome(role: string): void {
    this.router.navigate(['/home']);
  }

  private getHighestPriorityRole(roles: string[]): string {
    const priorityOrder = ['ADMINISTRADOR', 'AGENTE', 'CLIENTE'];

    for (const role of priorityOrder) {
      if (roles.includes(role)) {
        return role;
      }
    }

    return roles[0];
  }

  // ================== MÉTODOS PARA COMPATIBILIDAD CON COMPONENTES ==================

  // Estos métodos mantienen la compatibilidad con los componentes existentes
  get currentUser() {
    return {
      getValue: () => this.getUser(),
      subscribe: (callback: (user: User | null) => void) => {
        return this.currentUser$.subscribe(callback);
      },
    };
  }
}
