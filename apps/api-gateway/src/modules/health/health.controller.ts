import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { RedisService } from '../cache/redis.service';
import { SkipRateLimit } from '../rate-limit/skip-rate-limit.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisService) {}

  @Public()
  @SkipRateLimit()
  @Get()
  async check() {
    const redis = await this.redis.ping();

    return {
      status: redis === 'PONG' ? 'ok' : 'degraded',
      service: 'api-gateway',
      dependencies: {
        redis: redis === 'PONG' ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
