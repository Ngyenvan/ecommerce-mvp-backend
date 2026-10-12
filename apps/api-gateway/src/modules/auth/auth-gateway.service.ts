import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AUTH_GRPC_CLIENT } from '../proxy/grpc-client.constants';
import { throwMappedGrpcError } from '../proxy/grpc-error.mapper';
import type {
  AuthGrpcService,
  LoginRequest,
  RegisterRequest,
} from './auth-grpc.interface';
import type { AuthUser, LoginResult } from './auth.types';

@Injectable()
export class AuthGatewayService implements OnModuleInit {
  private authGrpc!: AuthGrpcService;

  constructor(
    @Inject(AUTH_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.authGrpc = this.grpcClient.getService<AuthGrpcService>('AuthService');
  }

  async register(request: RegisterRequest): Promise<{ user: AuthUser }> {
    try {
      return await firstValueFrom(this.authGrpc.register(request));
    } catch (error: unknown) {
      throwMappedGrpcError(error);
    }
  }

  async login(request: LoginRequest): Promise<LoginResult> {
    try {
      return await firstValueFrom(this.authGrpc.login(request));
    } catch (error: unknown) {
      throwMappedGrpcError(error);
    }
  }

  async getUser(uid: number): Promise<{ user: AuthUser }> {
    try {
      return await firstValueFrom(this.authGrpc.getUser({ uid }));
    } catch (error: unknown) {
      throwMappedGrpcError(error);
    }
  }
}
