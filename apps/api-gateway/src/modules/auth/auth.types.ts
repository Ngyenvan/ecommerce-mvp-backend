import type { Request } from 'express';

export type AuthRole = 'CUSTOMER' | 'ADMIN';

export interface AuthUser {
  uid: number;
  username: string;
  role: AuthRole;
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
