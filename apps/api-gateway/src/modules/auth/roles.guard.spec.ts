import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  let guard: RolesGuard;

  beforeEach(() => {
    jest.resetAllMocks();

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows routes without role requirements', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext('CUSTOMER'))).toBe(true);
  });

  it('allows a user with the required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(guard.canActivate(createContext('ADMIN'))).toBe(true);
  });

  it('rejects a user without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext('CUSTOMER'))).toThrow(
      ForbiddenException,
    );
  });

  function createContext(role: 'CUSTOMER' | 'ADMIN'): ExecutionContext {
    return {
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            uid: 1,
            username: 'test-user',
            role,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  }
});
