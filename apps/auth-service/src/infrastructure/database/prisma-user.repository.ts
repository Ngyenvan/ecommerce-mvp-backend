import { Injectable } from '@nestjs/common';
import { isRoleName } from '../../domain/auth/role-name';
import { UserEntity } from '../../domain/auth/user.entity';
import { UserRepository } from '../../domain/auth/user.repository';
import { PrismaService } from '../database/prisma.service';

interface UserRecordWithRole {
  uid: number;
  username: string;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: {
    rolename: string;
  };
}

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUsername(
    username: string,
  ): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: {
        username: username.trim().toLowerCase(),
      },
      include: {
        role: true,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findById(uid: number): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { uid },
      include: {
        role: true,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    if (user.uid !== undefined) {
      throw new Error('Cannot create a user that already has an id');
    }

    const record = await this.prisma.user.create({
      data: {
        username: user.username,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        role: {
          connect: {
            rolename: user.role,
          },
        },
      },
      include: {
        role: true,
      },
    });

    return this.toDomain(record);
  }

  async update(user: UserEntity): Promise<UserEntity> {
    if (user.uid === undefined) {
      throw new Error('Cannot update a user without an id');
    }

    const record = await this.prisma.user.update({
      where: {
        uid: user.uid,
      },
      data: {
        username: user.username,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        role: {
          connect: {
            rolename: user.role,
          },
        },
      },
      include: {
        role: true,
      },
    });

    return this.toDomain(record);
  }

  private toDomain(record: UserRecordWithRole): UserEntity {
    if (!isRoleName(record.role.rolename)) {
      throw new Error(
        `Unsupported role: ${record.role.rolename}`,
      );
    }

    return UserEntity.restore({
      uid: record.uid,
      username: record.username,
      passwordHash: record.passwordHash,
      role: record.role.rolename,
      isActive: record.isActive,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
