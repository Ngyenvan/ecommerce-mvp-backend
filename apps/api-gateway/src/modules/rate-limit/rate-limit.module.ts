import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GatewayRedisModule } from '../cache/redis.module';
import { RedisRateLimitGuard } from './redis-rate-limit.guard';

@Module({
  imports: [GatewayRedisModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RedisRateLimitGuard,
    },
  ],
})
export class RateLimitModule {}
