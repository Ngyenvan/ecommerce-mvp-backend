import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutboxPublisherModule } from './application/outbox/outbox-publisher.module';
import { OrderGrpcModule } from './presentation/grpc/order-grpc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    OutboxPublisherModule,
    OrderGrpcModule,
  ],
})
export class AppModule {}
