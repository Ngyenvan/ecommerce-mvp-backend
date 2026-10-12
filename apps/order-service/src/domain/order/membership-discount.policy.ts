import { Money } from './money.value-object';
import { InvalidDiscountError } from './order.errors';

export class MembershipDiscountPolicy {
  private constructor(
    readonly score: number,
    private readonly discountBasisPoints: number,
  ) {}

  static from(
    score: number,
    discountPercent: string,
  ): MembershipDiscountPolicy {
    if (!Number.isInteger(score) || score < 0) {
      throw new InvalidDiscountError(
        'Membership score must be a non-negative integer',
      );
    }

    const normalizedPercent = discountPercent.trim();

    if (
      !/^(0|[1-9]\d?)(\.\d{1,2})?$|^100(\.0{1,2})?$/.test(normalizedPercent)
    ) {
      throw new InvalidDiscountError(
        'Discount percent must be between 0 and 100 with at most 2 decimal places',
      );
    }

    const [wholePart, decimalPart = ''] = normalizedPercent.split('.');
    const basisPoints =
      Number.parseInt(wholePart, 10) * 100 +
      Number.parseInt(decimalPart.padEnd(2, '0') || '0', 10);

    return new MembershipDiscountPolicy(score, basisPoints);
  }

  calculateDiscount(subtotal: Money): Money {
    return subtotal.percentage(this.discountBasisPoints);
  }

  get discountPercent(): string {
    const wholePart = Math.floor(this.discountBasisPoints / 100);
    const decimalPart = this.discountBasisPoints % 100;

    return `${wholePart}.${decimalPart.toString().padStart(2, '0')}`;
  }
}
