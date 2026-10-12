import { Module } from '@nestjs/common';
import { CustomerApplicationModule } from '../../application/customer/customer-application.module';
import { CustomerGrpcController } from './customer-grpc.controller';

@Module({
  imports: [CustomerApplicationModule],
  controllers: [CustomerGrpcController],
})
export class CustomerGrpcModule {}
