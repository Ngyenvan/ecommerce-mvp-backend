import { Module } from '@nestjs/common';
import { AuthApplicationModule } from '../../application/auth/auth-application.module';
import { AuthGrpcController } from './auth-grpc.controller';

@Module({
  imports: [AuthApplicationModule],
  controllers: [AuthGrpcController],
})
export class AuthGrpcModule {}
