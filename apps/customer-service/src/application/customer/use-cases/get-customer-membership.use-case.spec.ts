import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import { CustomerNotFoundError } from '../errors/customer.errors';
import { GetCustomerMembershipUseCase } from './get-customer-membership.use-case';

describe('GetCustomerMembershipUseCase', () => {
  const silver = MembershipTierEntity.restore({
    mid: 2,
    name: 'SILVER',
    minScore: 1000,
    discountPercent: 5,
  });

  const customers = {
    findByUid: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    saveScoreAdjustment: jest.fn(),
  };

  let useCase: GetCustomerMembershipUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    useCase = new GetCustomerMembershipUseCase(
      customers as unknown as CustomerRepository,
    );
  });

  it('returns customer score and membership', async () => {
    const now = new Date('2026-10-12T10:00:00.000Z');

    customers.findByUid.mockResolvedValue(
      CustomerEntity.restore({
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
        score: 1500,
        membership: silver,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const result = await useCase.execute(10);

    expect(result).toEqual({
      uid: 10,
      score: 1500,
      membership: {
        mid: 2,
        name: 'SILVER',
        minScore: 1000,
        discountPercent: '5.00',
      },
    });
  });

  it('throws when the customer does not exist', async () => {
    customers.findByUid.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(
      CustomerNotFoundError,
    );
  });
});
