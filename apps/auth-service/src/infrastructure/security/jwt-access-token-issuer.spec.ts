import { JwtService } from '@nestjs/jwt';
import { RoleName } from '../../domain/auth/role-name';
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JwtAccessTokenIssuer,
} from './jwt-access-token-issuer';

describe('JwtAccessTokenIssuer', () => {
  const secret =
    'unit-test-secret-with-at-least-thirty-two-characters';

  it('issues a verifiable access token', async () => {
    const jwtService = new JwtService({
      secret,
      signOptions: {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      },
    });

    const issuer = new JwtAccessTokenIssuer(jwtService);

    const issued = await issuer.issue({
      uid: 42,
      username: 'customer',
      role: RoleName.Customer,
    });

    const payload = await jwtService.verifyAsync<{
      sub: string;
      username: string;
      role: string;
      iat: number;
      exp: number;
    }>(issued.accessToken, {
      secret,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    expect(issued.expiresInSeconds).toBe(900);
    expect(payload.sub).toBe('42');
    expect(payload.username).toBe('customer');
    expect(payload.role).toBe('CUSTOMER');
    expect(payload.exp - payload.iat).toBe(900);
  });
});
