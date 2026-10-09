import { Injectable } from '@nestjs/common';
import { RoleName } from '../../../domain/auth/role-name';
import { UserRepository } from '../../../domain/auth/user.repository';
import {
  AccountDisabledError,
  InvalidCredentialsError,
} from '../errors/login.errors';
import { AccessTokenIssuer } from '../ports/access-token-issuer';
import { PasswordHasher } from '../ports/password-hasher';

export interface LoginUserCommand {
  username: string;
  password: string;
}

export interface LoginUserResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: {
    uid: number;
    username: string;
    role: RoleName;
  };
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(
    command: LoginUserCommand,
  ): Promise<LoginUserResult> {
    const user = await this.users.findByUsername(command.username);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.matches(
      command.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    if (user.uid === undefined) {
      throw new Error('Stored user does not have an id');
    }

    const issuedToken = await this.tokenIssuer.issue({
      uid: user.uid,
      username: user.username,
      role: user.role,
    });

    user.markLogin();
    await this.users.update(user);

    return {
      accessToken: issuedToken.accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: issuedToken.expiresInSeconds,
      user: {
        uid: user.uid,
        username: user.username,
        role: user.role,
      },
    };
  }
}
