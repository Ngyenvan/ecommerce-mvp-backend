import { RoleName } from '../../../domain/auth/role-name';

export interface AccessTokenPayload {
  uid: number;
  username: string;
  role: RoleName;
}

export interface IssuedAccessToken {
  accessToken: string;
  expiresInSeconds: number;
}

export abstract class AccessTokenIssuer {
  abstract issue(
    payload: AccessTokenPayload,
  ): Promise<IssuedAccessToken>;
}
