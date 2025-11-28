import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../shared/enviroments/enviroment';

// Interfaces para el servicio de usuarios
export interface UserRegistrationRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
   roleIds: number[];     // ✅ Array de números
  createdUser?: number;  // ✅ Agregado
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
  token?: string; // Para reset de contraseña
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  countryCallingCode: string;
  phone: string;
  birthDate: string;
  active: boolean;
  avatarUrl?: string;
  roles: string[];
  passport?: {
    id: number;
    passportNumber: string;
    expiryDate: string;
    issuanceCountry: string;
    nationality: string;
  };
}

export interface PaginatedUsersResponse {
  users: UserResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiDeviajeUsers;

  // ================== MÉTODOS PARA ADMINISTRACIÓN DE USUARIOS ==================

  /**
   * Registrar un nuevo usuario (solo administradores)
   */
  registerUser(
    userData: UserRegistrationRequest
  ): Observable<ApiResponse<UserResponse>> {
    return this.http.post<ApiResponse<UserResponse>>(
      `${this.baseUrl}`,
      userData
    );
  }

  getUserByUsername(username: string): Observable<UserData> {
    return this.http.get<UserData>(`${this.baseUrl}/username/${username}`);
  }

  /**
   * Obtener todos los usuarios con paginación
   */
  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}`);
  }

  /**
   * Obtener todos los usuarios con paginación
   */
  getAllUsersByRole(role: string): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}/role/${role}`);
  }

  /**
   * Obtener un usuario por ID
   */
  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Actualizar un usuario
   */
  updateUser(
    id: number,
    userData: UserUpdateRequest
  ): Observable<ApiResponse<UserResponse>> {
    return this.http.put<ApiResponse<UserResponse>>(
      `${this.baseUrl}/${id}`,
      userData
    );
  }

  /**
   * Eliminar/Desactivar un usuario
   */
  deleteUser(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Activar/Desactivar un usuario
   */
  toggleUserStatus(id: number): Observable<ApiResponse<UserResponse>> {
    return this.http.patch<ApiResponse<UserResponse>>(
      `${this.baseUrl}/${id}/toggle-status`,
      {}
    );
  }

  // ================== MÉTODOS PARA CAMBIO DE CONTRASEÑA ==================

  /**
   * Cambiar contraseña (usuario autenticado)
   */
  changePassword(
    passwordData: ChangePasswordRequest
  ): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.baseUrl}/change-password`,
      passwordData
    );
  }

  /**
   * Reset de contraseña con token
   */
  resetPassword(
    passwordData: ChangePasswordRequest
  ): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.baseUrl}/reset-password`,
      passwordData
    );
  }

  /**
   * Forzar cambio de contraseña (administradores)
   */
  forcePasswordChange(userId: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.baseUrl}/${userId}/force-password-change`,
      {}
    );
  }

  // ================== MÉTODOS PARA ROLES ==================

  /**
   * Obtener todos los roles disponibles
   */
  getAvailableRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/roles`);
  }

  /**
   * Asignar roles a un usuario
   */
  assignRoles(
    userId: number,
    roles: string[]
  ): Observable<ApiResponse<UserResponse>> {
    return this.http.post<ApiResponse<UserResponse>>(
      `${this.baseUrl}/${userId}/roles`,
      { roles }
    );
  }

  /**
   * Remover roles de un usuario
   */
  removeRoles(
    userId: number,
    roles: string[]
  ): Observable<ApiResponse<UserResponse>> {
    return this.http.delete<ApiResponse<UserResponse>>(
      `${this.baseUrl}/${userId}/roles`,
      {
        body: { roles },
      }
    );
  }

  // ================== MÉTODOS PARA VALIDACIONES ==================

  /**
   * Verificar si un username está disponible
   */
  checkUsernameAvailability(
    username: string
  ): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(
      `${environment.apiDeviajeValidation}/username/${username}`
    );
  }

  /**
   * Verificar si un email está disponible
   */
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(
      `${environment.apiDeviajeValidation}/email/${email}`
    );
  }
}
