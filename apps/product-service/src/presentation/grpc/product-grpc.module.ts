import { Module } from '@nestjs/common';
import { ProductApplicationModule } from '../../application/product/product-application.module';
import { ProductGrpcController } from './product-grpc.controller';

@Module({
  imports: [ProductApplicationModule],
  controllers: [ProductGrpcController],
})
export class ProductGrpcModule {}
