import { RoleName } from '../../../domain/auth/role-name';
import { UserEntity } from '../../../domain/auth/user.entity';
import { UserRepository } from '../../../domain/auth/user.repository';
import { UserNotFoundError } from '../errors/user-not-found.error';
import { GetUserUseCase } from './get-user.use-case';

class FakeUserRepository extends UserRepository {
  user: UserEntity | null = UserEntity.restore({
    uid: 42,
    username: 'customer',
    passwordHash: 'stored-hash',
    role: RoleName.Customer,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  async findById(): Promise<UserEntity | null> {
    return this.user;
  }

  async findByUsername(): Promise<UserEntity | null> {
    return this.user;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    return user;
  }

  async update(user: UserEntity): Promise<UserEntity> {
    return user;
  }
}

describe('GetUserUseCase', () => {
  it('returns a user without exposing passwordHash', async () => {
    const result = await new GetUserUseCase(
      new FakeUserRepository(),
    ).execute(42);

    expect(result).toEqual({
      uid: 42,
      username: 'customer',
      role: RoleName.Customer,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an unknown user id', async () => {
    const repository = new FakeUserRepository();
    repository.user = null;

    await expect(
      new GetUserUseCase(repository).execute(999),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
