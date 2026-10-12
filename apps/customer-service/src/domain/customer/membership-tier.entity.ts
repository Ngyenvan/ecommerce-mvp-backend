export interface RestoreMembershipTierProps {
  mid: number;
  name: string;
  minScore: number;
  discountPercent: number;
}

export class MembershipTierEntity {
  private constructor(
    private readonly tierId: number | undefined,
    private tierName: string,
    private minimumScore: number,
    private discountRate: number,
  ) {}

  static createNew(
    name: string,
    minScore: number,
    discountPercent: number,
  ): MembershipTierEntity {
    const normalizedName = this.normalizeName(name);

    this.validateName(normalizedName);
    this.validateMinScore(minScore);
    this.validateDiscountPercent(discountPercent);

    return new MembershipTierEntity(
      undefined,
      normalizedName,
      minScore,
      discountPercent,
    );
  }

  static restore(props: RestoreMembershipTierProps): MembershipTierEntity {
    if (!Number.isInteger(props.mid) || props.mid <= 0) {
      throw new Error('Membership tier id must be a positive integer');
    }

    const normalizedName = this.normalizeName(props.name);

    this.validateName(normalizedName);
    this.validateMinScore(props.minScore);
    this.validateDiscountPercent(props.discountPercent);

    return new MembershipTierEntity(
      props.mid,
      normalizedName,
      props.minScore,
      props.discountPercent,
    );
  }

  updateDetails(name: string, minScore: number, discountPercent: number): void {
    const normalizedName = MembershipTierEntity.normalizeName(name);

    MembershipTierEntity.validateName(normalizedName);
    MembershipTierEntity.validateMinScore(minScore);
    MembershipTierEntity.validateDiscountPercent(discountPercent);

    this.tierName = normalizedName;
    this.minimumScore = minScore;
    this.discountRate = discountPercent;
  }

  isEligibleFor(score: number): boolean {
    MembershipTierEntity.validateScore(score);
    return score >= this.minimumScore;
  }

  private static normalizeName(name: string): string {
    return name.trim().toUpperCase();
  }

  private static validateName(name: string): void {
    if (name.length === 0 || name.length > 50) {
      throw new Error(
        'Membership tier name must contain between 1 and 50 characters',
      );
    }
  }

  private static validateMinScore(minScore: number): void {
    if (!Number.isInteger(minScore) || minScore < 0) {
      throw new Error('Minimum score must be a non-negative integer');
    }
  }

  private static validateDiscountPercent(discountPercent: number): void {
    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      throw new Error('Discount percent must be between 0 and 100');
    }
  }

  private static validateScore(score: number): void {
    if (!Number.isInteger(score) || score < 0) {
      throw new Error('Customer score must be a non-negative integer');
    }
  }

  get mid(): number | undefined {
    return this.tierId;
  }

  get name(): string {
    return this.tierName;
  }

  get minScore(): number {
    return this.minimumScore;
  }

  get discountPercent(): number {
    return this.discountRate;
  }
}
