import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import {
  CustomerNotFoundError,
  InvalidScoreAdjustmentError,
} from '../errors/customer.errors';
import { AdjustCustomerScoreUseCase } from './adjust-customer-score.use-case';

describe('AdjustCustomerScoreUseCase', () => {
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

  const customers = {
    findByUid: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    hasScoreAdjustment: jest.fn(),
    saveScoreAdjustment: jest.fn(),
  };

  const memberships = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  let useCase: AdjustCustomerScoreUseCase;

  function createCustomer(): CustomerEntity {
    const now = new Date('2026-10-12T10:00:00.000Z');

    return CustomerEntity.restore({
      uid: 10,
      fullName: 'Nguyen Van A',
      email: 'customer@example.com',
      phone: '0901234567',
      score: 0,
      membership: bronze,
      createdAt: now,
      updatedAt: now,
    });
  }

  beforeEach(() => {
    jest.resetAllMocks();

    customers.findByUid.mockResolvedValue(createCustomer());
    customers.hasScoreAdjustment.mockResolvedValue(false);
    customers.saveScoreAdjustment.mockResolvedValue(true);
    memberships.findAll.mockResolvedValue([bronze, silver]);

    useCase = new AdjustCustomerScoreUseCase(
      customers as unknown as CustomerRepository,
      memberships as unknown as MembershipRepository,
    );
  });

  it('adds score and promotes the customer', async () => {
    const result = await useCase.execute({
      uid: 10,
      scoreDelta: 1000,
      reason: ' Order completed ',
      referenceId: ' order-1001 ',
    });

    expect(result.score).toBe(1000);
    expect(result.membership.name).toBe('SILVER');
    expect(result.membership.discountPercent).toBe('5.00');

    expect(customers.saveScoreAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        scoreDelta: 1000,
        reason: 'Order completed',
        referenceId: 'order-1001',
      }),
    );
  });

  it('returns current state for a duplicated reference', async () => {
    customers.hasScoreAdjustment.mockResolvedValue(true);

    const result = await useCase.execute({
      uid: 10,
      scoreDelta: 1000,
      reason: 'Order completed',
      referenceId: 'order-1001',
    });

    expect(result.score).toBe(0);
    expect(memberships.findAll).not.toHaveBeenCalled();
    expect(customers.saveScoreAdjustment).not.toHaveBeenCalled();
  });

  it('throws when the customer does not exist', async () => {
    customers.findByUid.mockResolvedValue(null);

    await expect(
      useCase.execute({
        uid: 999,
        scoreDelta: 100,
        reason: 'Order completed',
        referenceId: 'order-1001',
      }),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
  });

  it('rejects an adjustment that makes score negative', async () => {
    await expect(
      useCase.execute({
        uid: 10,
        scoreDelta: -1,
        reason: 'Refund',
        referenceId: 'refund-1001',
      }),
    ).rejects.toThrow('Customer score must be a non-negative integer');

    expect(customers.saveScoreAdjustment).not.toHaveBeenCalled();
  });

  it('rejects an empty reference id', async () => {
    await expect(
      useCase.execute({
        uid: 10,
        scoreDelta: 100,
        reason: 'Order completed',
        referenceId: ' ',
      }),
    ).rejects.toBeInstanceOf(InvalidScoreAdjustmentError);

    expect(customers.findByUid).not.toHaveBeenCalled();
  });
});
