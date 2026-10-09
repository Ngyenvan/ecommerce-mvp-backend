import { Injectable } from '@nestjs/common';
import { RoleName } from '../../../domain/auth/role-name';
import { UserRepository } from '../../../domain/auth/user.repository';
import { UserNotFoundError } from '../errors/user-not-found.error';

export interface GetUserResult {
  uid: number;
  username: string;
  role: RoleName;
}

@Injectable()
export class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(uid: number): Promise<GetUserResult> {
    if (!Number.isInteger(uid) || uid <= 0) {
      throw new UserNotFoundError();
    }

    const user = await this.users.findById(uid);

    if (!user || user.uid === undefined) {
      throw new UserNotFoundError();
    }

    return {
      uid: user.uid,
      username: user.username,
      role: user.role,
    };
  }
}
