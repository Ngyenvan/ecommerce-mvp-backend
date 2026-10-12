import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderCreatedConsumerModule } from './infrastructure/messaging/order-created-consumer.module';
import { ShipmentGrpcModule } from './presentation/grpc/shipment-grpc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    OrderCreatedConsumerModule,
    ShipmentGrpcModule,
  ],
})
export class AppModule {}
