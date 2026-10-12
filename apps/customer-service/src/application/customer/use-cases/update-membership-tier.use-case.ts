import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import { MembershipResult, toMembershipResult } from '../dto/customer-result';
import {
  InvalidMembershipUpdateError,
  MembershipAlreadyExistsError,
  MembershipNotFoundError,
} from '../errors/membership.errors';

export interface UpdateMembershipTierCommand {
  mid: number;
  name?: string;
  minScore?: number;
  discountPercent?: number;
}

@Injectable()
export class UpdateMembershipTierUseCase {
  constructor(private readonly memberships: MembershipRepository) {}

  async execute(
    command: UpdateMembershipTierCommand,
  ): Promise<MembershipResult> {
    if (
      command.name === undefined &&
      command.minScore === undefined &&
      command.discountPercent === undefined
    ) {
      throw new InvalidMembershipUpdateError();
    }

    const membership = await this.memberships.findById(command.mid);

    if (!membership) {
      throw new MembershipNotFoundError(command.mid);
    }

    const candidate = MembershipTierEntity.createNew(
      command.name ?? membership.name,
      command.minScore ?? membership.minScore,
      command.discountPercent ?? membership.discountPercent,
    );

    const [membershipWithName, existingMemberships] = await Promise.all([
      this.memberships.findByName(candidate.name),
      this.memberships.findAll(),
    ]);

    if (membershipWithName && membershipWithName.mid !== command.mid) {
      throw new MembershipAlreadyExistsError('name');
    }

    const membershipWithMinScore = existingMemberships.some(
      (existing) =>
        existing.mid !== command.mid &&
        existing.minScore === candidate.minScore,
    );

    if (membershipWithMinScore) {
      throw new MembershipAlreadyExistsError('minScore');
    }

    membership.updateDetails(
      candidate.name,
      candidate.minScore,
      candidate.discountPercent,
    );

    const savedMembership = await this.memberships.update(membership);

    return toMembershipResult(savedMembership);
  }
}
