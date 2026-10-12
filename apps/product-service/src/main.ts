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
        package: 'ecommerce.product.v1',
        protoPath: join(
          __dirname,
          '../../../packages/contracts/proto/product.proto',
        ),
        url: process.env.PRODUCT_GRPC_URL ?? '0.0.0.0:50053',
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
