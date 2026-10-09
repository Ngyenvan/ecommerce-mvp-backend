import { RoleName } from '../../../domain/auth/role-name';
import { UserEntity } from '../../../domain/auth/user.entity';
import { UserRepository } from '../../../domain/auth/user.repository';
import { UsernameAlreadyExistsError } from '../errors/registration.errors';
import { PasswordHasher } from '../ports/password-hasher';
import { RegisterUserUseCase } from './register-user.use-case';

class FakeUserRepository extends UserRepository {
  readonly users: UserEntity[] = [];
  private nextId = 1;

  async findByUsername(
    username: string,
  ): Promise<UserEntity | null> {
    const normalized = username.trim().toLowerCase();

    return (
      this.users.find((user) => user.username === normalized) ??
      null
    );
  }

  async findById(uid: number): Promise<UserEntity | null> {
    return this.users.find((user) => user.uid === uid) ?? null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const now = new Date();

    const savedUser = UserEntity.restore({
      uid: this.nextId++,
      username: user.username,
      passwordHash: user.passwordHash,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: now,
      updatedAt: now,
    });

    this.users.push(savedUser);
    return savedUser;
  }

  async update(user: UserEntity): Promise<UserEntity> {
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

describe('RegisterUserUseCase', () => {
  let users: FakeUserRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    users = new FakeUserRepository();
    useCase = new RegisterUserUseCase(
      users,
      new FakePasswordHasher(),
    );
  });

  it('registers a normalized CUSTOMER account', async () => {
    const result = await useCase.execute({
      username: '  NewCustomer  ',
      password: 'StrongPassword123!',
    });

    expect(result).toEqual({
      uid: 1,
      username: 'newcustomer',
      role: RoleName.Customer,
    });
    expect(users.users[0].passwordHash).toBe(
      'hashed:StrongPassword123!',
    );
  });

  it('rejects an existing username', async () => {
    await useCase.execute({
      username: 'existing-user',
      password: 'StrongPassword123!',
    });

    await expect(
      useCase.execute({
        username: ' EXISTING-USER ',
        password: 'AnotherPassword123!',
      }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsError);
  });

  it('rejects a password shorter than eight characters', async () => {
    await expect(
      useCase.execute({
        username: 'new-user',
        password: 'short',
      }),
    ).rejects.toThrow(
      'Password must contain at least 8 characters',
    );
  });
});
