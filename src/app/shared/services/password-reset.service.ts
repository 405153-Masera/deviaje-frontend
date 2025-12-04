import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../enviroments/enviroment';
import { ApiResponse, ChangePasswordRequest } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class PasswordResetService {
  private readonly http = inject(HttpClient);
  private url = environment.apiDeviajeAuth;

  /**
   * Solicita un correo de recuperación de contraseña
   * @param email Email del usuario
   */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.url}/forgot-password`, { email });
  }

  /**
   * Restablece la contraseña con el token recibido
   * @param token Token de recuperación
   * @param newPassword Nueva contraseña
   * @param confirmPassword Confirmación de la nueva contraseña
   */
  resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<any> {
    return this.http.post(`${this.url}/reset-password`, {
      token,
      newPassword,
      confirmPassword,
    });
  }

  changePassword(
    passwordData: ChangePasswordRequest
  ): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.url}/change-password`,
      passwordData
    );
  }
}
