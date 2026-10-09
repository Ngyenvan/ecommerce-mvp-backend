import { UserEntity } from './user.entity';

export abstract class UserRepository {
  abstract findByUsername(
    username: string,
  ): Promise<UserEntity | null>;

  abstract findById(
    uid: number,
  ): Promise<UserEntity | null>;

  abstract create(
    user: UserEntity,
  ): Promise<UserEntity>;

  abstract update(
    user: UserEntity,
  ): Promise<UserEntity>;
}
