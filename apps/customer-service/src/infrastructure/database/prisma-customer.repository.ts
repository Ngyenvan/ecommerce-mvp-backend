import { Injectable } from '@nestjs/common';
import { CustomerEntity } from '../../domain/customer/customer.entity';
import {
  CustomerRepository,
  SaveScoreAdjustmentInput,
} from '../../domain/customer/customer.repository';
import { MembershipTierEntity } from '../../domain/customer/membership-tier.entity';
import { PrismaService } from './prisma.service';

interface MembershipRecord {
  mid: number;
  name: string;
  minScore: number;
  discountPercent: {
    toString(): string;
  };
}

interface CustomerRecordWithMembership {
  uid: number;
  fullName: string;
  email: string;
  phone: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
  membership: MembershipRecord;
}

@Injectable()
export class PrismaCustomerRepository extends CustomerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUid(uid: number): Promise<CustomerEntity | null> {
    const record = await this.prisma.customer.findUnique({
      where: { uid },
      include: {
        membership: true,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<CustomerEntity | null> {
    const record = await this.prisma.customer.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      include: {
        membership: true,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    const normalizedPhone = phone.trim().replace(/\s+/g, '');

    const record = await this.prisma.customer.findUnique({
      where: {
        phone: normalizedPhone,
      },
      include: {
        membership: true,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async create(customer: CustomerEntity): Promise<CustomerEntity> {
    const membershipId = customer.membership.mid;

    if (membershipId === undefined) {
      throw new Error(
        'Cannot create a customer without a persisted membership',
      );
    }

    const record = await this.prisma.customer.create({
      data: {
        uid: customer.uid,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        score: customer.score,
        membership: {
          connect: {
            mid: membershipId,
          },
        },
      },
      include: {
        membership: true,
      },
    });

    return this.toDomain(record);
  }

  async update(customer: CustomerEntity): Promise<CustomerEntity> {
    const membershipId = customer.membership.mid;

    if (membershipId === undefined) {
      throw new Error(
        'Cannot update a customer without a persisted membership',
      );
    }

    const record = await this.prisma.customer.update({
      where: {
        uid: customer.uid,
      },
      data: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        score: customer.score,
        membership: {
          connect: {
            mid: membershipId,
          },
        },
      },
      include: {
        membership: true,
      },
    });

    return this.toDomain(record);
  }
  async hasScoreAdjustment(uid: number, referenceId: string): Promise<boolean> {
    const adjustment = await this.prisma.scoreAdjustment.findUnique({
      where: {
        uid_referenceId: {
          uid,
          referenceId: referenceId.trim(),
        },
      },
    });

    return adjustment !== null;
  }
  async saveScoreAdjustment(input: SaveScoreAdjustmentInput): Promise<boolean> {
    const membershipId = input.customer.membership.mid;

    if (membershipId === undefined) {
      throw new Error('Cannot save score without a persisted membership');
    }

    const reason = input.reason.trim();
    const referenceId = input.referenceId.trim();

    if (reason.length === 0 || reason.length > 255) {
      throw new Error(
        'Score adjustment reason must contain between 1 and 255 characters',
      );
    }

    if (referenceId.length === 0 || referenceId.length > 100) {
      throw new Error(
        'Score adjustment reference id must contain between 1 and 100 characters',
      );
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const existingAdjustment = await transaction.scoreAdjustment.findUnique(
          {
            where: {
              uid_referenceId: {
                uid: input.customer.uid,
                referenceId,
              },
            },
          },
        );

        if (existingAdjustment) {
          return false;
        }

        await transaction.customer.update({
          where: {
            uid: input.customer.uid,
          },
          data: {
            score: input.customer.score,
            membershipId,
            updatedAt: input.customer.updatedAt,
          },
        });

        await transaction.scoreAdjustment.create({
          data: {
            uid: input.customer.uid,
            scoreDelta: input.scoreDelta,
            reason,
            referenceId,
          },
        });

        return true;
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  private toDomain(record: CustomerRecordWithMembership): CustomerEntity {
    const membership = MembershipTierEntity.restore({
      mid: record.membership.mid,
      name: record.membership.name,
      minScore: record.membership.minScore,
      discountPercent: Number(record.membership.discountPercent.toString()),
    });

    return CustomerEntity.restore({
      uid: record.uid,
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      score: record.score,
      membership,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
