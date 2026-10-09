import { Injectable } from '@nestjs/common';
import { RoleName } from '../../../domain/auth/role-name';
import { UserEntity } from '../../../domain/auth/user.entity';
import { UserRepository } from '../../../domain/auth/user.repository';
import {
  InvalidPasswordError,
  UsernameAlreadyExistsError,
} from '../errors/registration.errors';
import { PasswordHasher } from '../ports/password-hasher';

export interface RegisterUserCommand {
  username: string;
  password: string;
}

export interface RegisterUserResult {
  uid: number;
  username: string;
  role: RoleName;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    command: RegisterUserCommand,
  ): Promise<RegisterUserResult> {
    this.validatePassword(command.password);

    const existingUser = await this.users.findByUsername(
      command.username,
    );

    if (existingUser) {
      throw new UsernameAlreadyExistsError();
    }

    const passwordHash = await this.passwordHasher.hash(
      command.password,
    );

    const newUser = UserEntity.createNew(
      command.username,
      passwordHash,
    );

    const savedUser = await this.users.create(newUser);

    if (savedUser.uid === undefined) {
      throw new Error('Repository did not assign a user id');
    }

    return {
      uid: savedUser.uid,
      username: savedUser.username,
      role: savedUser.role,
    };
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new InvalidPasswordError(
        'Password must contain at least 8 characters',
      );
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new InvalidPasswordError(
        'Password must not exceed 72 bytes',
      );
    }
  }
}
