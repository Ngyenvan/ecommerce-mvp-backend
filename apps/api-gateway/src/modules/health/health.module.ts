import { Module } from '@nestjs/common';
import { GatewayRedisModule } from '../cache/redis.module';
import { HealthController } from './health.controller';

@Module({
  imports: [GatewayRedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
