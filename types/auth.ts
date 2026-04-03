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
  role?: "user" | "admin";
  emailVerified?: boolean;
  createdAt?: Date;
}

export interface AuthResponse {
  user: AuthUser;
  message?: string;
  verificationRequired?: boolean;
}

export interface MeResponse {
  user: AuthUser;
}
