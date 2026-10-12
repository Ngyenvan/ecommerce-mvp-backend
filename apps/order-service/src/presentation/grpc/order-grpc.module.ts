import { Module } from '@nestjs/common';
import { OrderApplicationModule } from '../../application/order/order-application.module';
import { OrderGrpcController } from './order-grpc.controller';

@Module({
  imports: [OrderApplicationModule],
  controllers: [OrderGrpcController],
})
export class OrderGrpcModule {}
