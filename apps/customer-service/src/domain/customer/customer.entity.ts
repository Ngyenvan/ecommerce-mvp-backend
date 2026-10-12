import { MembershipPolicy } from './membership-policy';
import { MembershipTierEntity } from './membership-tier.entity';

export interface CreateCustomerProps {
  uid: number;
  fullName: string;
  email: string;
  phone: string;
}

export interface RestoreCustomerProps extends CreateCustomerProps {
  score: number;
  membership: MembershipTierEntity;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCustomerProfileProps {
  fullName?: string;
  email?: string;
  phone?: string;
}

export class CustomerEntity {
  private constructor(
    private readonly customerId: number,
    private customerFullName: string,
    private customerEmail: string,
    private customerPhone: string,
    private customerScore: number,
    private membershipTier: MembershipTierEntity,
    private readonly created: Date,
    private updated: Date,
  ) {}

  static createNew(
    props: CreateCustomerProps,
    tiers: readonly MembershipTierEntity[],
  ): CustomerEntity {
    this.validateUid(props.uid);

    const fullName = this.normalizeFullName(props.fullName);
    const email = this.normalizeEmail(props.email);
    const phone = this.normalizePhone(props.phone);

    this.validateFullName(fullName);
    this.validateEmail(email);
    this.validatePhone(phone);

    const initialScore = 0;
    const membership = MembershipPolicy.selectTier(initialScore, tiers);
    const now = new Date();

    return new CustomerEntity(
      props.uid,
      fullName,
      email,
      phone,
      initialScore,
      membership,
      now,
      now,
    );
  }

  static restore(props: RestoreCustomerProps): CustomerEntity {
    this.validateUid(props.uid);
    this.validateScore(props.score);

    const fullName = this.normalizeFullName(props.fullName);
    const email = this.normalizeEmail(props.email);
    const phone = this.normalizePhone(props.phone);

    this.validateFullName(fullName);
    this.validateEmail(email);
    this.validatePhone(phone);

    return new CustomerEntity(
      props.uid,
      fullName,
      email,
      phone,
      props.score,
      props.membership,
      props.createdAt,
      props.updatedAt,
    );
  }

  updateProfile(
    props: UpdateCustomerProfileProps,
    at: Date = new Date(),
  ): void {
    if (props.fullName !== undefined) {
      const fullName = CustomerEntity.normalizeFullName(props.fullName);
      CustomerEntity.validateFullName(fullName);
      this.customerFullName = fullName;
    }

    if (props.email !== undefined) {
      const email = CustomerEntity.normalizeEmail(props.email);
      CustomerEntity.validateEmail(email);
      this.customerEmail = email;
    }

    if (props.phone !== undefined) {
      const phone = CustomerEntity.normalizePhone(props.phone);
      CustomerEntity.validatePhone(phone);
      this.customerPhone = phone;
    }

    this.updated = at;
  }

  adjustScore(
    scoreDelta: number,
    tiers: readonly MembershipTierEntity[],
    at: Date = new Date(),
  ): void {
    if (!Number.isInteger(scoreDelta) || scoreDelta === 0) {
      throw new Error('Score delta must be a non-zero integer');
    }

    const nextScore = this.customerScore + scoreDelta;
    CustomerEntity.validateScore(nextScore);

    const nextMembership = MembershipPolicy.selectTier(nextScore, tiers);

    this.customerScore = nextScore;
    this.membershipTier = nextMembership;
    this.updated = at;
  }

  private static normalizeFullName(fullName: string): string {
    return fullName.trim().replace(/\s+/g, ' ');
  }

  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static normalizePhone(phone: string): string {
    return phone.trim().replace(/\s+/g, '');
  }

  private static validateUid(uid: number): void {
    if (!Number.isInteger(uid) || uid <= 0) {
      throw new Error('Customer uid must be a positive integer');
    }
  }

  private static validateFullName(fullName: string): void {
    if (fullName.length < 2 || fullName.length > 100) {
      throw new Error('Full name must contain between 2 and 100 characters');
    }
  }

  private static validateEmail(email: string): void {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email.length > 255 || !emailPattern.test(email)) {
      throw new Error('Email address is invalid');
    }
  }

  private static validatePhone(phone: string): void {
    const phonePattern = /^\+?[0-9]{8,15}$/;

    if (!phonePattern.test(phone)) {
      throw new Error('Phone number must contain between 8 and 15 digits');
    }
  }

  private static validateScore(score: number): void {
    if (!Number.isInteger(score) || score < 0) {
      throw new Error('Customer score must be a non-negative integer');
    }
  }

  get uid(): number {
    return this.customerId;
  }

  get fullName(): string {
    return this.customerFullName;
  }

  get email(): string {
    return this.customerEmail;
  }

  get phone(): string {
    return this.customerPhone;
  }

  get score(): number {
    return this.customerScore;
  }

  get membership(): MembershipTierEntity {
    return this.membershipTier;
  }

  get createdAt(): Date {
    return this.created;
  }

  get updatedAt(): Date {
    return this.updated;
  }
}
