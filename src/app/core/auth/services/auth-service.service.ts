import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
//import { LoginRequest } from '../../../interfaces/auth/login-request';
//import { AuthResponse } from '../../../interfaces/auth/auth-response';
//import { SignupRequest } from '../../../interfaces/auth/signup-request';

@Injectable({
  providedIn: 'root'
})
export class AuthServiceService {
 /* private apiUrl = 'http://localhost:9060/api/auth';
  private usuarioActualSubject = new BehaviorSubject<any>(null);
  public usuarioActual = this.usuarioActualSubject.asObservable();

  constructor(private http: HttpClient) {
    // No accedemos a localStorage en el constructor
  }

  // Método para inicializar el usuario actual
  inicializarUsuario(): void {
    if (typeof localStorage !== 'undefined') {
      const usuarioGuardado = localStorage.getItem('usuario');
      if (usuarioGuardado) {
        this.usuarioActualSubject.next(JSON.parse(usuarioGuardado));
      }
    }
  }

  login(credenciales: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credenciales).pipe(
      map(respuesta => {
        if (typeof localStorage !== 'undefined') {
          // Guardar token y usuario en localStorage
          localStorage.setItem('token', respuesta.token);
          localStorage.setItem('usuario', JSON.stringify({
            id: respuesta.id,
            username: respuesta.username,
            email: respuesta.email,
            roles: respuesta.roles
          }));
        }

        // Actualizar el subject del usuario actual
        this.usuarioActualSubject.next({
          id: respuesta.id,
          username: respuesta.username,
          email: respuesta.email,
          roles: respuesta.roles
        });

        return respuesta;
      })
    );
  }

  signup(datosRegistro: SignupRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, datosRegistro);
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      // Limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }

    // Limpiar el subject del usuario actual
    this.usuarioActualSubject.next(null);
  }

  obtenerTokenActual(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  }

  estaAutenticado(): boolean {
    return !!this.obtenerTokenActual();
  }

  obtenerRolesUsuario(): string[] {
    if (typeof localStorage !== 'undefined') {
      const usuario = localStorage.getItem('usuario');
      return usuario ? JSON.parse(usuario).roles : [];
    }
    return [];
  }*/
}