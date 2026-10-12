import { MembershipTierEntity } from './membership-tier.entity';

export class MembershipPolicy {
  static selectTier(
    score: number,
    tiers: readonly MembershipTierEntity[],
  ): MembershipTierEntity {
    this.validateScore(score);

    const selectedTier = [...tiers]
      .filter((tier) => tier.isEligibleFor(score))
      .sort((first, second) => second.minScore - first.minScore)[0];

    if (!selectedTier) {
      throw new Error('No membership tier is configured for this score');
    }

    return selectedTier;
  }

  private static validateScore(score: number): void {
    if (!Number.isInteger(score) || score < 0) {
      throw new Error('Customer score must be a non-negative integer');
    }
  }
}
