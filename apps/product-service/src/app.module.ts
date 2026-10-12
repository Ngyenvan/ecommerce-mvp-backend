import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductGrpcModule } from './presentation/grpc/product-grpc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    ProductGrpcModule,
  ],
})
export class AppModule {}
