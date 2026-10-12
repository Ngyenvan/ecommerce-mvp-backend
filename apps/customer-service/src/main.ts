import 'dotenv/config';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.customer.v1',
        protoPath: join(
          __dirname,
          '../../../packages/contracts/proto/customer.proto',
        ),
        url: process.env.CUSTOMER_GRPC_URL ?? '0.0.0.0:50052',
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    },
  );

  await app.listen();
}

void bootstrap();
