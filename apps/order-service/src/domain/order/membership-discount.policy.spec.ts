import { MembershipDiscountPolicy } from './membership-discount.policy';
import { Money } from './money.value-object';
import { InvalidDiscountError } from './order.errors';

describe('MembershipDiscountPolicy', () => {
  it('calculates a normalized membership discount', () => {
    const policy = MembershipDiscountPolicy.from(1_500, '10');

    expect(policy.discountPercent).toBe('10.00');
    expect(policy.calculateDiscount(Money.from('3025.00')).toString()).toBe(
      '302.50',
    );
  });

  it('allows a zero discount', () => {
    const policy = MembershipDiscountPolicy.from(0, '0');

    expect(policy.calculateDiscount(Money.from('100.00')).toString()).toBe(
      '0.00',
    );
  });

  it('rejects invalid scores and percentages', () => {
    expect(() => MembershipDiscountPolicy.from(-1, '10')).toThrow(
      InvalidDiscountError,
    );
    expect(() => MembershipDiscountPolicy.from(1_000, '100.01')).toThrow(
      InvalidDiscountError,
    );
  });
});
