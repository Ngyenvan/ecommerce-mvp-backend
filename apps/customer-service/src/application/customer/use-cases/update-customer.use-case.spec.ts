import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import {
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
  InvalidCustomerUpdateError,
} from '../errors/customer.errors';
import { UpdateCustomerUseCase } from './update-customer.use-case';

describe('UpdateCustomerUseCase', () => {
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

  let useCase: UpdateCustomerUseCase;

  function createCustomer(
    uid = 10,
    email = 'customer@example.com',
    phone = '0901234567',
  ): CustomerEntity {
    const now = new Date('2026-10-12T10:00:00.000Z');

    return CustomerEntity.restore({
      uid,
      fullName: 'Nguyen Van A',
      email,
      phone,
      score: 0,
      membership: bronze,
      createdAt: now,
      updatedAt: now,
    });
  }

  beforeEach(() => {
    jest.resetAllMocks();

    customers.findByEmail.mockResolvedValue(null);
    customers.findByPhone.mockResolvedValue(null);
    customers.update.mockImplementation(
      async (customer: CustomerEntity) => customer,
    );

    useCase = new UpdateCustomerUseCase(
      customers as unknown as CustomerRepository,
    );
  });

  it('updates and normalizes customer information', async () => {
    customers.findByUid.mockResolvedValue(createCustomer());

    const result = await useCase.execute({
      uid: 10,
      fullName: '  Nguyen   Van B ',
      email: ' NEW@EXAMPLE.COM ',
      phone: '091 234 5678',
    });

    expect(result.fullName).toBe('Nguyen Van B');
    expect(result.email).toBe('new@example.com');
    expect(result.phone).toBe('0912345678');
    expect(customers.update).toHaveBeenCalledTimes(1);
  });

  it('throws when the customer does not exist', async () => {
    customers.findByUid.mockResolvedValue(null);

    await expect(
      useCase.execute({
        uid: 999,
        fullName: 'Updated Name',
      }),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);

    expect(customers.update).not.toHaveBeenCalled();
  });

  it('rejects an email owned by another customer', async () => {
    customers.findByUid.mockResolvedValue(createCustomer());
    customers.findByEmail.mockResolvedValue(
      createCustomer(20, 'used@example.com', '0999999999'),
    );

    await expect(
      useCase.execute({
        uid: 10,
        email: 'used@example.com',
      }),
    ).rejects.toBeInstanceOf(CustomerAlreadyExistsError);

    expect(customers.update).not.toHaveBeenCalled();
  });

  it('rejects an update without any fields', async () => {
    await expect(
      useCase.execute({
        uid: 10,
      }),
    ).rejects.toBeInstanceOf(InvalidCustomerUpdateError);

    expect(customers.findByUid).not.toHaveBeenCalled();
    expect(customers.update).not.toHaveBeenCalled();
  });
});
