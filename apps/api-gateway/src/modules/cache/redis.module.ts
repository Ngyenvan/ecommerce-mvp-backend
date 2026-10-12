import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { REDIS_CLIENT } from './redis.constants';
import type { RedisClient } from './redis.constants';
import { RedisService } from './redis.service';

const redisLogger = new Logger('RedisClient');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisClient => {
        const client = createClient({
          url: configService.getOrThrow<string>('REDIS_URL'),
          socket: {
            reconnectStrategy: (retries: number) =>
              Math.min(retries * 100, 3_000),
          },
        });

        client.on('error', (error: Error) => {
          redisLogger.error(`Redis client error: ${error.message}`);
        });

        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class GatewayRedisModule {}
