import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenIssuer,
  AccessTokenPayload,
  IssuedAccessToken,
} from '../../application/auth/ports/access-token-issuer';

export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 900;
export const JWT_ISSUER = 'ecommerce-auth-service';
export const JWT_AUDIENCE = 'ecommerce-api';

@Injectable()
export class JwtAccessTokenIssuer extends AccessTokenIssuer {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async issue(
    payload: AccessTokenPayload,
  ): Promise<IssuedAccessToken> {
    const accessToken = await this.jwtService.signAsync(
      {
        username: payload.username,
        role: payload.role,
      },
      {
        subject: String(payload.uid),
      },
    );

    return {
      accessToken,
      expiresInSeconds: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
  }
}
