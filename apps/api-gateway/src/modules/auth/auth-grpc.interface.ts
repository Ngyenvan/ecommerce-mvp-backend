import type { Observable } from 'rxjs';
import type { AuthUser, LoginResult } from './auth.types';

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthGrpcService {
  register(request: RegisterRequest): Observable<{
    user: AuthUser;
  }>;

  login(request: LoginRequest): Observable<LoginResult>;

  getUser(request: { uid: number }): Observable<{
    user: AuthUser;
  }>;
}
