import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE_KEY } from './public.decorator';
import type { AuthenticatedRequest, AuthRole } from './auth.types';

interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Bearer access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          issuer:
            this.configService.get<string>('JWT_ISSUER') ??
            'ecommerce-auth-service',
          audience:
            this.configService.get<string>('JWT_AUDIENCE') ?? 'ecommerce-api',
        },
      );

      const uid = Number(payload.sub);

      if (
        !Number.isInteger(uid) ||
        uid <= 0 ||
        typeof payload.username !== 'string' ||
        !this.isAuthRole(payload.role)
      ) {
        throw new UnauthorizedException('Access token payload is invalid');
      }

      request.user = {
        uid,
        username: payload.username,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }

  private extractBearerToken(
    authorization: string | undefined,
  ): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');

    if (type?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private isAuthRole(value: string): value is AuthRole {
    return value === 'CUSTOMER' || value === 'ADMIN';
  }
}
