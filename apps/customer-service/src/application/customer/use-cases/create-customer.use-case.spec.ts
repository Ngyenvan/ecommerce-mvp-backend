import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import {
  CustomerAlreadyExistsError,
  MembershipConfigurationError,
} from '../errors/customer.errors';
import { CreateCustomerUseCase } from './create-customer.use-case';

describe('CreateCustomerUseCase', () => {
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

  const memberships = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  let useCase: CreateCustomerUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    memberships.findAll.mockResolvedValue([bronze]);
    customers.findByUid.mockResolvedValue(null);
    customers.findByEmail.mockResolvedValue(null);
    customers.findByPhone.mockResolvedValue(null);
    customers.create.mockImplementation(
      async (customer: CustomerEntity) => customer,
    );

    useCase = new CreateCustomerUseCase(
      customers as unknown as CustomerRepository,
      memberships as unknown as MembershipRepository,
    );
  });

  it('creates a normalized BRONZE customer', async () => {
    const result = await useCase.execute({
      uid: 10,
      fullName: '  Nguyen   Van A ',
      email: ' CUSTOMER@EXAMPLE.COM ',
      phone: '090 123 4567',
    });

    expect(result).toMatchObject({
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
    });
    expect(result.createdAt).toEqual(expect.any(String));
    expect(result.updatedAt).toEqual(expect.any(String));
  });

  it('rejects a duplicated email', async () => {
    const existingCustomer = CustomerEntity.createNew(
      {
        uid: 20,
        fullName: 'Existing Customer',
        email: 'customer@example.com',
        phone: '0912345678',
      },
      [bronze],
    );

    customers.findByEmail.mockResolvedValue(existingCustomer);

    await expect(
      useCase.execute({
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      }),
    ).rejects.toBeInstanceOf(CustomerAlreadyExistsError);

    expect(customers.create).not.toHaveBeenCalled();
  });

  it('fails safely when no membership tier exists', async () => {
    memberships.findAll.mockResolvedValue([]);

    await expect(
      useCase.execute({
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      }),
    ).rejects.toBeInstanceOf(MembershipConfigurationError);

    expect(customers.create).not.toHaveBeenCalled();
  });
});
