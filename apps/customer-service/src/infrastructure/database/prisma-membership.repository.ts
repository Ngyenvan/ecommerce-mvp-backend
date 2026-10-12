import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../../domain/customer/membership.repository';
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

@Injectable()
export class PrismaMembershipRepository extends MembershipRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<MembershipTierEntity[]> {
    const records = await this.prisma.membership.findMany({
      orderBy: {
        minScore: 'asc',
      },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findById(mid: number): Promise<MembershipTierEntity | null> {
    const record = await this.prisma.membership.findUnique({
      where: { mid },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByName(name: string): Promise<MembershipTierEntity | null> {
    const record = await this.prisma.membership.findUnique({
      where: {
        name: name.trim().toUpperCase(),
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async create(
    membership: MembershipTierEntity,
  ): Promise<MembershipTierEntity> {
    if (membership.mid !== undefined) {
      throw new Error('Cannot create a membership that already has an id');
    }

    const record = await this.prisma.membership.create({
      data: {
        name: membership.name,
        minScore: membership.minScore,
        discountPercent: membership.discountPercent,
      },
    });

    return this.toDomain(record);
  }

  async update(
    membership: MembershipTierEntity,
  ): Promise<MembershipTierEntity> {
    if (membership.mid === undefined) {
      throw new Error('Cannot update a membership without an id');
    }

    const record = await this.prisma.membership.update({
      where: {
        mid: membership.mid,
      },
      data: {
        name: membership.name,
        minScore: membership.minScore,
        discountPercent: membership.discountPercent,
      },
    });

    return this.toDomain(record);
  }

  private toDomain(record: MembershipRecord): MembershipTierEntity {
    return MembershipTierEntity.restore({
      mid: record.mid,
      name: record.name,
      minScore: record.minScore,
      discountPercent: Number(record.discountPercent.toString()),
    });
  }
}
