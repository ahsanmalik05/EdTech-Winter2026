export interface AuthRegisterRequest {
  email: string;
  password: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  createdAt?: Date;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}
