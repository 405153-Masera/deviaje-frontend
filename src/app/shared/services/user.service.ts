import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../shared/enviroments/enviroment';

// Interfaces para el servicio de usuarios
export interface UserRegistrationRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
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

  /**
   * Obtener todos los usuarios con paginación
   */
  getAllUsers(
    page: number = 0,
    size: number = 10,
    search?: string,
    role?: string
  ): Observable<PaginatedUsersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (role) {
      params = params.set('role', role);
    }

    return this.http.get<PaginatedUsersResponse>(`${this.baseUrl}`, { params });
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

  // ================== MÉTODOS PARA AGENTES ==================

  /**
   * Obtener clientes de un agente
   */
  getAgentClients(
    agentId: number,
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedUsersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedUsersResponse>(
      `${this.baseUrl}/agent/${agentId}/clients`,
      { params }
    );
  }

  /**
   * Asignar un cliente a un agente
   */
  assignClientToAgent(
    agentId: number,
    clientId: number
  ): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.baseUrl}/agent/${agentId}/clients/${clientId}`,
      {}
    );
  }

  /**
   * Remover un cliente de un agente
   */
  removeClientFromAgent(
    agentId: number,
    clientId: number
  ): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.baseUrl}/agent/${agentId}/clients/${clientId}`
    );
  }
}
