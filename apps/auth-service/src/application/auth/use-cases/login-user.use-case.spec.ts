import { RoleName } from '../../../domain/auth/role-name';
import { UserEntity } from '../../../domain/auth/user.entity';
import { UserRepository } from '../../../domain/auth/user.repository';
import {
  AccountDisabledError,
  InvalidCredentialsError,
} from '../errors/login.errors';
import {
  AccessTokenIssuer,
  AccessTokenPayload,
  IssuedAccessToken,
} from '../ports/access-token-issuer';
import { PasswordHasher } from '../ports/password-hasher';
import { LoginUserUseCase } from './login-user.use-case';

class FakeUserRepository extends UserRepository {
  user: UserEntity | null = UserEntity.restore({
    uid: 1,
    username: 'customer',
    passwordHash: 'hashed:StrongPassword123!',
    role: RoleName.Customer,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  updatedUser: UserEntity | null = null;

  async findByUsername(): Promise<UserEntity | null> {
    return this.user;
  }

  async findById(): Promise<UserEntity | null> {
    return this.user;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    return user;
  }

  async update(user: UserEntity): Promise<UserEntity> {
    this.updatedUser = user;
    return user;
  }
}

class FakePasswordHasher extends PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return `hashed:${plainText}`;
  }

  async matches(
    plainText: string,
    passwordHash: string,
  ): Promise<boolean> {
    return passwordHash === `hashed:${plainText}`;
  }
}

class FakeAccessTokenIssuer extends AccessTokenIssuer {
  issuedPayload: AccessTokenPayload | null = null;

  async issue(
    payload: AccessTokenPayload,
  ): Promise<IssuedAccessToken> {
    this.issuedPayload = payload;

    return {
      accessToken: 'test-access-token',
      expiresInSeconds: 900,
    };
  }
}

describe('LoginUserUseCase', () => {
  let users: FakeUserRepository;
  let tokenIssuer: FakeAccessTokenIssuer;
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    users = new FakeUserRepository();
    tokenIssuer = new FakeAccessTokenIssuer();
    useCase = new LoginUserUseCase(
      users,
      new FakePasswordHasher(),
      tokenIssuer,
    );
  });

  it('returns a token and records login time', async () => {
    const result = await useCase.execute({
      username: 'customer',
      password: 'StrongPassword123!',
    });

    expect(result.accessToken).toBe('test-access-token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.role).toBe(RoleName.Customer);
    expect(tokenIssuer.issuedPayload?.uid).toBe(1);
    expect(users.updatedUser?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown username', async () => {
    users.user = null;

    await expect(
      useCase.execute({
        username: 'missing',
        password: 'StrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects an incorrect password', async () => {
    await expect(
      useCase.execute({
        username: 'customer',
        password: 'WrongPassword',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects a disabled account', async () => {
    users.user?.deactivate();

    await expect(
      useCase.execute({
        username: 'customer',
        password: 'StrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(AccountDisabledError);
  });
});
