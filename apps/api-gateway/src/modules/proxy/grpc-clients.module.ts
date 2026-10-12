import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, GrpcOptions } from '@nestjs/microservices';
import {
  AUTH_GRPC_CLIENT,
  CUSTOMER_GRPC_CLIENT,
  ORDER_GRPC_CLIENT,
  PRODUCT_GRPC_CLIENT,
  SHIPMENT_GRPC_CLIENT,
} from './grpc-client.constants';
import { createGrpcClientOptions } from './grpc-client.options';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): GrpcOptions =>
          createGrpcClientOptions({
            packageName: 'ecommerce.auth.v1',
            protoFile: 'auth.proto',
            url:
              configService.get<string>('AUTH_GRPC_URL') ?? 'localhost:50051',
          }),
      },
      {
        name: CUSTOMER_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): GrpcOptions =>
          createGrpcClientOptions({
            packageName: 'ecommerce.customer.v1',
            protoFile: 'customer.proto',
            url:
              configService.get<string>('CUSTOMER_GRPC_URL') ??
              'localhost:50052',
          }),
      },
      {
        name: PRODUCT_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): GrpcOptions =>
          createGrpcClientOptions({
            packageName: 'ecommerce.product.v1',
            protoFile: 'product.proto',
            url:
              configService.get<string>('PRODUCT_GRPC_URL') ??
              'localhost:50053',
          }),
      },
      {
        name: ORDER_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): GrpcOptions =>
          createGrpcClientOptions({
            packageName: 'ecommerce.order.v1',
            protoFile: 'order.proto',
            url:
              configService.get<string>('ORDER_GRPC_URL') ?? 'localhost:50054',
          }),
      },
      {
        name: SHIPMENT_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): GrpcOptions =>
          createGrpcClientOptions({
            packageName: 'ecommerce.shipment.v1',
            protoFile: 'shipment.proto',
            url:
              configService.get<string>('SHIPMENT_GRPC_URL') ??
              'localhost:50055',
          }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcClientsModule {}
