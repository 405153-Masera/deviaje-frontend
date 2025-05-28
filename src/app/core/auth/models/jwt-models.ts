//Models para el login
export interface JwtResponse {
  token: string;
  refreshToken: string;
  type: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

//Models para registrar usuario
export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthDate?: Date;
}

//Models para recuperar la contraseña
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

//Models para respuesta
export interface MessageResponse {
  message: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  avatar?: string;
}
