import { MembershipPolicy } from './membership-policy';
import { MembershipTierEntity } from './membership-tier.entity';

describe('MembershipPolicy', () => {
  const bronze = MembershipTierEntity.restore({
    mid: 1,
    name: 'BRONZE',
    minScore: 0,
    discountPercent: 0,
  });

  const silver = MembershipTierEntity.restore({
    mid: 2,
    name: 'SILVER',
    minScore: 1000,
    discountPercent: 5,
  });

  const gold = MembershipTierEntity.restore({
    mid: 3,
    name: 'GOLD',
    minScore: 5000,
    discountPercent: 10,
  });

  const tiers = [gold, bronze, silver];

  it('selects BRONZE below the SILVER threshold', () => {
    expect(MembershipPolicy.selectTier(999, tiers).name).toBe('BRONZE');
  });

  it('selects SILVER at its exact threshold', () => {
    expect(MembershipPolicy.selectTier(1000, tiers).name).toBe('SILVER');
  });

  it('selects GOLD at its exact threshold', () => {
    expect(MembershipPolicy.selectTier(5000, tiers).name).toBe('GOLD');
  });

  it('selects the highest eligible tier', () => {
    expect(MembershipPolicy.selectTier(10000, tiers).name).toBe('GOLD');
  });

  it('rejects a negative score', () => {
    expect(() => MembershipPolicy.selectTier(-1, tiers)).toThrow(
      'Customer score must be a non-negative integer',
    );
  });

  it('fails when no tier is eligible', () => {
    expect(() => MembershipPolicy.selectTier(0, [silver, gold])).toThrow(
      'No membership tier is configured for this score',
    );
  });
});
