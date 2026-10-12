import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGatewayService } from './auth-gateway.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { GrpcClientsModule } from '../proxy/grpc-clients.module';

@Module({
  imports: [
    ConfigModule,
    GrpcClientsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');

        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_ACCESS_SECRET must contain at least 32 characters',
          );
        }

        return {
          secret,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthGatewayService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthGatewayService, JwtModule],
})
export class AuthModule {}
