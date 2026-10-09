import { Module } from '@nestjs/common';
import { AuthPersistenceModule } from '../../infrastructure/database/auth-persistence.module';
import { SecurityModule } from '../../infrastructure/security/security.module';
import { GetUserUseCase } from './use-cases/get-user.use-case';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';

@Module({
  imports: [
    AuthPersistenceModule,
    SecurityModule,
  ],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    GetUserUseCase,
  ],
  exports: [
    RegisterUserUseCase,
    LoginUserUseCase,
    GetUserUseCase,
  ],
})
export class AuthApplicationModule {}
