import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipResult, toMembershipResult } from '../dto/customer-result';

@Injectable()
export class ListMembershipTiersUseCase {
  constructor(private readonly memberships: MembershipRepository) {}

  async execute(): Promise<MembershipResult[]> {
    const memberships = await this.memberships.findAll();

    return memberships.map(toMembershipResult);
  }
}
