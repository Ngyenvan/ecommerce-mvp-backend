import { Module } from '@nestjs/common';
import { UserRepository } from '../../domain/auth/user.repository';
import { PrismaModule } from './prisma.module';
import { PrismaUserRepository } from './prisma-user.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [UserRepository],
})
export class AuthPersistenceModule {}
