import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerGrpcModule } from './presentation/grpc/customer-grpc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    CustomerGrpcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
