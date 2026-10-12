import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RedisService } from '../cache/redis.service';
import { SKIP_RATE_LIMIT_KEY } from './skip-rate-limit.decorator';

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly windowSeconds: number;
  private readonly maxRequests: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    configService: ConfigService,
  ) {
    this.windowSeconds = this.readPositiveInteger(
      configService,
      'RATE_LIMIT_WINDOW_SECONDS',
      60,
    );

    this.maxRequests = this.readPositiveInteger(
      configService,
      'RATE_LIMIT_MAX_REQUESTS',
      100,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const identity = request.ip ?? request.socket.remoteAddress ?? 'unknown';

    const count = await this.redis.incrementWithTtl(
      `rate-limit:${identity}`,
      this.windowSeconds,
    );

    response.setHeader('X-RateLimit-Limit', this.maxRequests);

    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(this.maxRequests - count, 0),
    );

    if (count > this.maxRequests) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private readPositiveInteger(
    configService: ConfigService,
    key: string,
    fallback: number,
  ): number {
    const value = Number(configService.get<string>(key) ?? String(fallback));

    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
