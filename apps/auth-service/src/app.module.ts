import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGrpcModule } from './presentation/grpc/auth-grpc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    AuthGrpcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
