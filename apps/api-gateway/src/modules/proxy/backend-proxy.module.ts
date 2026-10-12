import { Module } from '@nestjs/common';
import { GatewayRedisModule } from '../cache/redis.module';
import { BackendProxyController } from './backend-proxy.controller';
import { BackendProxyService } from './backend-proxy.service';
import { GrpcClientsModule } from './grpc-clients.module';

@Module({
  imports: [GrpcClientsModule, GatewayRedisModule],
  controllers: [BackendProxyController],
  providers: [BackendProxyService],
})
export class BackendProxyModule {}
