import { CustomerEntity } from './customer.entity';
import { MembershipTierEntity } from './membership-tier.entity';

describe('CustomerEntity', () => {
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

  it('creates a customer with normalized profile and BRONZE tier', () => {
    const customer = CustomerEntity.createNew(
      {
        uid: 10,
        fullName: '  Nguyen   Van A  ',
        email: '  CUSTOMER@EXAMPLE.COM ',
        phone: '090 123 4567',
      },
      tiers,
    );

    expect(customer.uid).toBe(10);
    expect(customer.fullName).toBe('Nguyen Van A');
    expect(customer.email).toBe('customer@example.com');
    expect(customer.phone).toBe('0901234567');
    expect(customer.score).toBe(0);
    expect(customer.membership.name).toBe('BRONZE');
  });

  it('rejects an invalid uid', () => {
    expect(() =>
      CustomerEntity.createNew(
        {
          uid: 0,
          fullName: 'Nguyen Van A',
          email: 'customer@example.com',
          phone: '0901234567',
        },
        tiers,
      ),
    ).toThrow('Customer uid must be a positive integer');
  });

  it('rejects an invalid email address', () => {
    expect(() =>
      CustomerEntity.createNew(
        {
          uid: 10,
          fullName: 'Nguyen Van A',
          email: 'invalid-email',
          phone: '0901234567',
        },
        tiers,
      ),
    ).toThrow('Email address is invalid');
  });

  it('promotes the customer when score reaches SILVER', () => {
    const customer = CustomerEntity.createNew(
      {
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      },
      tiers,
    );

    customer.adjustScore(1000, tiers);

    expect(customer.score).toBe(1000);
    expect(customer.membership.name).toBe('SILVER');
  });

  it('promotes the customer when score reaches GOLD', () => {
    const customer = CustomerEntity.createNew(
      {
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      },
      tiers,
    );

    customer.adjustScore(5000, tiers);

    expect(customer.score).toBe(5000);
    expect(customer.membership.name).toBe('GOLD');
  });

  it('rejects an adjustment that makes score negative', () => {
    const customer = CustomerEntity.createNew(
      {
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      },
      tiers,
    );

    expect(() => customer.adjustScore(-1, tiers)).toThrow(
      'Customer score must be a non-negative integer',
    );

    expect(customer.score).toBe(0);
  });

  it('updates and normalizes the customer profile', () => {
    const customer = CustomerEntity.createNew(
      {
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      },
      tiers,
    );

    customer.updateProfile({
      fullName: '  Nguyen   Van B ',
      email: ' NEW@EXAMPLE.COM ',
      phone: '091 234 5678',
    });

    expect(customer.fullName).toBe('Nguyen Van B');
    expect(customer.email).toBe('new@example.com');
    expect(customer.phone).toBe('0912345678');
  });
});
