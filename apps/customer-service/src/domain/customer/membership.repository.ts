import { MembershipTierEntity } from './membership-tier.entity';

export abstract class MembershipRepository {
  abstract findAll(): Promise<MembershipTierEntity[]>;

  abstract findById(mid: number): Promise<MembershipTierEntity | null>;

  abstract findByName(name: string): Promise<MembershipTierEntity | null>;

  abstract create(
    membership: MembershipTierEntity,
  ): Promise<MembershipTierEntity>;

  abstract update(
    membership: MembershipTierEntity,
  ): Promise<MembershipTierEntity>;
}
