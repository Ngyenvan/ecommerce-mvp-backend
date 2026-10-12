import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import { MembershipResult, toMembershipResult } from '../dto/customer-result';
import { MembershipAlreadyExistsError } from '../errors/membership.errors';

export interface CreateMembershipTierCommand {
  name: string;
  minScore: number;
  discountPercent: number;
}

@Injectable()
export class CreateMembershipTierUseCase {
  constructor(private readonly memberships: MembershipRepository) {}

  async execute(
    command: CreateMembershipTierCommand,
  ): Promise<MembershipResult> {
    const membership = MembershipTierEntity.createNew(
      command.name,
      command.minScore,
      command.discountPercent,
    );

    const [membershipWithName, existingMemberships] = await Promise.all([
      this.memberships.findByName(membership.name),
      this.memberships.findAll(),
    ]);

    if (membershipWithName) {
      throw new MembershipAlreadyExistsError('name');
    }

    const membershipWithMinScore = existingMemberships.some(
      (existing) => existing.minScore === membership.minScore,
    );

    if (membershipWithMinScore) {
      throw new MembershipAlreadyExistsError('minScore');
    }

    const savedMembership = await this.memberships.create(membership);

    return toMembershipResult(savedMembership);
  }
}
