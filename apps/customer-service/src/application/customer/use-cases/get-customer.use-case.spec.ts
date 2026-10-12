import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import { CustomerNotFoundError } from '../errors/customer.errors';
import { GetCustomerUseCase } from './get-customer.use-case';

describe('GetCustomerUseCase', () => {
  const bronze = MembershipTierEntity.restore({
    mid: 1,
    name: 'BRONZE',
    minScore: 0,
    discountPercent: 0,
  });

  const customers = {
    findByUid: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    saveScoreAdjustment: jest.fn(),
  };

  let useCase: GetCustomerUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    useCase = new GetCustomerUseCase(
      customers as unknown as CustomerRepository,
    );
  });

  it('returns an existing customer', async () => {
    const now = new Date('2026-10-12T10:00:00.000Z');

    customers.findByUid.mockResolvedValue(
      CustomerEntity.restore({
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
        score: 0,
        membership: bronze,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const result = await useCase.execute(10);

    expect(result).toEqual({
      uid: 10,
      fullName: 'Nguyen Van A',
      email: 'customer@example.com',
      phone: '0901234567',
      score: 0,
      membership: {
        mid: 1,
        name: 'BRONZE',
        minScore: 0,
        discountPercent: '0.00',
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('throws when the customer does not exist', async () => {
    customers.findByUid.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(
      CustomerNotFoundError,
    );

    expect(customers.update).not.toHaveBeenCalled();
  });
});
