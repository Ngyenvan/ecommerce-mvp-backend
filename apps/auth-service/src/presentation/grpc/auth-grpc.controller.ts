import { Controller } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import {
  GrpcMethod,
  RpcException,
} from '@nestjs/microservices';
import { AccountDisabledError, InvalidCredentialsError } from '../../application/auth/errors/login.errors';
import {
  InvalidPasswordError,
  UsernameAlreadyExistsError,
} from '../../application/auth/errors/registration.errors';
import { UserNotFoundError } from '../../application/auth/errors/user-not-found.error';
import { GetUserUseCase } from '../../application/auth/use-cases/get-user.use-case';
import { LoginUserUseCase } from '../../application/auth/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../../application/auth/use-cases/register-user.use-case';

interface RegisterRequest {
  username: string;
  password: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface GetUserRequest {
  uid: number;
}

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly getUser: GetUserUseCase,
  ) {}

  @GrpcMethod('AuthService', 'Register')
  async register(request: RegisterRequest) {
    try {
      const user = await this.registerUser.execute(request);
      return { user };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('AuthService', 'Login')
  async login(request: LoginRequest) {
    try {
      const result = await this.loginUser.execute(request);

      return {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresInSeconds: result.expiresInSeconds,
        user: result.user,
      };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('AuthService', 'GetUser')
  async findUser(request: GetUserRequest) {
    try {
      const user = await this.getUser.execute(request.uid);
      return { user };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (error instanceof UsernameAlreadyExistsError) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: error.message,
      });
    }

    if (error instanceof InvalidPasswordError) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error.message,
      });
    }

    if (error instanceof InvalidCredentialsError) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: error.message,
      });
    }

    if (error instanceof AccountDisabledError) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: error.message,
      });
    }

    if (error instanceof UserNotFoundError) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error.message,
      });
    }

    throw new RpcException({
      code: status.INTERNAL,
      message: 'Internal server error',
    });
  }
}
