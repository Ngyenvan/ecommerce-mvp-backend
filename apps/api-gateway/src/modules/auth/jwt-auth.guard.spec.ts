import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const jwtService = {
    verifyAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.resetAllMocks();

    configService.get.mockImplementation((key: string) => {
      if (key === 'JWT_ISSUER') {
        return 'ecommerce-auth-service';
      }

      if (key === 'JWT_AUDIENCE') {
        return 'ecommerce-api';
      }

      return undefined;
    });

    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('allows a public route without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a protected route without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches a valid JWT user to the request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    jwtService.verifyAsync.mockResolvedValue({
      sub: '10',
      username: 'customer',
      role: 'CUSTOMER',
    });

    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(request).toHaveProperty('user', {
      uid: 10,
      username: 'customer',
      role: 'CUSTOMER',
    });
  });

  function createContext(
    request: object = {
      headers: {},
    },
  ): ExecutionContext {
    return {
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }
});
