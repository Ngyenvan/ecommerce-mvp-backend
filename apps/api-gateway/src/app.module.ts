import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { GatewayRedisModule } from './modules/cache/redis.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './modules/logging/logging.module';
import { BackendProxyModule } from './modules/proxy/backend-proxy.module';
import { GrpcClientsModule } from './modules/proxy/grpc-clients.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    GatewayRedisModule,
    GrpcClientsModule,
    AuthModule,
    BackendProxyModule,
    RateLimitModule,
    LoggingModule,
    HealthModule,
  ],
})
export class AppModule {}
