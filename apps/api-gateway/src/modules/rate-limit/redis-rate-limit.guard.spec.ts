import { ExecutionContext, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../cache/redis.service';
import { RedisRateLimitGuard } from './redis-rate-limit.guard';

describe('RedisRateLimitGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const redis = {
    incrementWithTtl: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'RATE_LIMIT_MAX_REQUESTS') {
        return '2';
      }

      if (key === 'RATE_LIMIT_WINDOW_SECONDS') {
        return '60';
      }

      return undefined;
    }),
  };

  let guard: RedisRateLimitGuard;

  beforeEach(() => {
    jest.resetAllMocks();

    config.get.mockImplementation((key: string) => {
      if (key === 'RATE_LIMIT_MAX_REQUESTS') {
        return '2';
      }

      if (key === 'RATE_LIMIT_WINDOW_SECONDS') {
        return '60';
      }

      return undefined;
    });

    guard = new RedisRateLimitGuard(
      reflector as unknown as Reflector,
      redis as unknown as RedisService,
      config as unknown as ConfigService,
    );
  });

  it('allows a request below the limit', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    redis.incrementWithTtl.mockResolvedValue(1);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('rejects a request above the limit', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    redis.incrementWithTtl.mockResolvedValue(3);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('skips endpoints marked to bypass rate limiting', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(redis.incrementWithTtl).not.toHaveBeenCalled();
  });

  function createContext(): ExecutionContext {
    const response = {
      setHeader: jest.fn(),
    };

    return {
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          socket: {},
        }),
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }
});
