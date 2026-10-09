import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenIssuer } from '../../application/auth/ports/access-token-issuer';
import { PasswordHasher } from '../../application/auth/ports/password-hasher';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JwtAccessTokenIssuer,
} from './jwt-access-token-issuer';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_ACCESS_SECRET');

        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_ACCESS_SECRET must contain at least 32 characters',
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
          },
        };
      },
    }),
  ],
  providers: [
    {
      provide: PasswordHasher,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: AccessTokenIssuer,
      useClass: JwtAccessTokenIssuer,
    },
  ],
  exports: [
    PasswordHasher,
    AccessTokenIssuer,
  ],
})
export class SecurityModule {}
