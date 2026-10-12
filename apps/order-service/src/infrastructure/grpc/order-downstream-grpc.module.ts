import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CustomerMembershipGateway } from '../../application/order/ports/customer-membership.gateway';
import { InventoryGateway } from '../../application/order/ports/inventory.gateway';
import { GrpcCustomerMembershipGateway } from './grpc-customer-membership.gateway';
import {
  CUSTOMER_GRPC_CLIENT,
  PRODUCT_GRPC_CLIENT,
} from './grpc-client.tokens';
import { GrpcInventoryGateway } from './grpc-inventory.gateway';

const contractsPath = join(
  __dirname,
  '../../../../../packages/contracts/proto',
);

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CUSTOMER_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'ecommerce.customer.v1',
            protoPath: join(contractsPath, 'customer.proto'),
            url: config.get<string>('CUSTOMER_GRPC_URL') ?? 'localhost:50052',
            loader: {
              keepCase: false,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
            },
          },
        }),
      },
      {
        name: PRODUCT_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'ecommerce.product.v1',
            protoPath: join(contractsPath, 'product.proto'),
            url: config.get<string>('PRODUCT_GRPC_URL') ?? 'localhost:50053',
            loader: {
              keepCase: false,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
            },
          },
        }),
      },
    ]),
  ],
  providers: [
    GrpcCustomerMembershipGateway,
    GrpcInventoryGateway,
    {
      provide: CustomerMembershipGateway,
      useExisting: GrpcCustomerMembershipGateway,
    },
    {
      provide: InventoryGateway,
      useExisting: GrpcInventoryGateway,
    },
  ],
  exports: [CustomerMembershipGateway, InventoryGateway],
})
export class OrderDownstreamGrpcModule {}
