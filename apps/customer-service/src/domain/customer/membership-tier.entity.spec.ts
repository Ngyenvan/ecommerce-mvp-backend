import { MembershipTierEntity } from './membership-tier.entity';

describe('MembershipTierEntity', () => {
  it('normalizes a new membership name', () => {
    const membership = MembershipTierEntity.createNew(' silver ', 1000, 5);

    expect(membership.mid).toBeUndefined();
    expect(membership.name).toBe('SILVER');
    expect(membership.minScore).toBe(1000);
    expect(membership.discountPercent).toBe(5);
  });

  it('restores an existing membership', () => {
    const membership = MembershipTierEntity.restore({
      mid: 2,
      name: 'SILVER',
      minScore: 1000,
      discountPercent: 5,
    });

    expect(membership.mid).toBe(2);
    expect(membership.name).toBe('SILVER');
  });

  it('rejects a negative minimum score', () => {
    expect(() => MembershipTierEntity.createNew('INVALID', -1, 5)).toThrow(
      'Minimum score must be a non-negative integer',
    );
  });

  it('rejects a discount greater than 100 percent', () => {
    expect(() => MembershipTierEntity.createNew('INVALID', 0, 101)).toThrow(
      'Discount percent must be between 0 and 100',
    );
  });

  it('checks whether a score is eligible', () => {
    const membership = MembershipTierEntity.createNew('SILVER', 1000, 5);

    expect(membership.isEligibleFor(999)).toBe(false);
    expect(membership.isEligibleFor(1000)).toBe(true);
  });

  it('updates membership details', () => {
    const membership = MembershipTierEntity.createNew('SILVER', 1000, 5);

    membership.updateDetails(' gold ', 5000, 10);

    expect(membership.name).toBe('GOLD');
    expect(membership.minScore).toBe(5000);
    expect(membership.discountPercent).toBe(10);
  });
});
