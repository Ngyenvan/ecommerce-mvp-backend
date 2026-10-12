import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { CustomerAlreadyExistsError } from '../../application/customer/errors/customer.errors';
import { AdjustCustomerScoreUseCase } from '../../application/customer/use-cases/adjust-customer-score.use-case';
import { CreateCustomerUseCase } from '../../application/customer/use-cases/create-customer.use-case';
import { CreateMembershipTierUseCase } from '../../application/customer/use-cases/create-membership-tier.use-case';
import { GetCustomerMembershipUseCase } from '../../application/customer/use-cases/get-customer-membership.use-case';
import { GetCustomerUseCase } from '../../application/customer/use-cases/get-customer.use-case';
import { ListMembershipTiersUseCase } from '../../application/customer/use-cases/list-membership-tiers.use-case';
import { UpdateCustomerUseCase } from '../../application/customer/use-cases/update-customer.use-case';
import { UpdateMembershipTierUseCase } from '../../application/customer/use-cases/update-membership-tier.use-case';
import { CustomerGrpcController } from './customer-grpc.controller';

async function expectRpcError(
  promise: Promise<unknown>,
  expectedCode: number,
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected an RPC error');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toMatchObject({
      code: expectedCode,
    });
  }
}

describe('CustomerGrpcController', () => {
  const createCustomer = {
    execute: jest.fn(),
  };

  const getCustomer = {
    execute: jest.fn(),
  };

  const updateCustomer = {
    execute: jest.fn(),
  };

  const getCustomerMembership = {
    execute: jest.fn(),
  };

  const adjustCustomerScore = {
    execute: jest.fn(),
  };

  const listMembershipTiers = {
    execute: jest.fn(),
  };

  const createMembershipTier = {
    execute: jest.fn(),
  };

  const updateMembershipTier = {
    execute: jest.fn(),
  };

  let controller: CustomerGrpcController;

  beforeEach(() => {
    jest.resetAllMocks();

    controller = new CustomerGrpcController(
      createCustomer as unknown as CreateCustomerUseCase,
      getCustomer as unknown as GetCustomerUseCase,
      updateCustomer as unknown as UpdateCustomerUseCase,
      getCustomerMembership as unknown as GetCustomerMembershipUseCase,
      adjustCustomerScore as unknown as AdjustCustomerScoreUseCase,
      listMembershipTiers as unknown as ListMembershipTiersUseCase,
      createMembershipTier as unknown as CreateMembershipTierUseCase,
      updateMembershipTier as unknown as UpdateMembershipTierUseCase,
    );
  });

  it('wraps a created customer in CustomerResponse', async () => {
    const customer = {
      uid: 10,
      fullName: 'Nguyen Van A',
    };

    createCustomer.execute.mockResolvedValue(customer);

    await expect(
      controller.create({
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      }),
    ).resolves.toEqual({ customer });
  });

  it('returns customer membership directly', async () => {
    const result = {
      uid: 10,
      score: 1000,
      membership: {
        mid: 2,
        name: 'SILVER',
        minScore: 1000,
        discountPercent: '5.00',
      },
    };

    getCustomerMembership.execute.mockResolvedValue(result);

    await expect(controller.findMembership({ uid: 10 })).resolves.toEqual(
      result,
    );
  });

  it('wraps the membership tier list', async () => {
    const memberships = [
      {
        mid: 1,
        name: 'BRONZE',
        minScore: 0,
        discountPercent: '0.00',
      },
    ];

    listMembershipTiers.execute.mockResolvedValue(memberships);

    await expect(controller.listMemberships()).resolves.toEqual({
      memberships,
    });
  });

  it('converts discount percent before creating a tier', async () => {
    const membership = {
      mid: 4,
      name: 'PLATINUM',
      minScore: 10000,
      discountPercent: '12.50',
    };

    createMembershipTier.execute.mockResolvedValue(membership);

    await expect(
      controller.createMembership({
        name: 'PLATINUM',
        minScore: 10000,
        discountPercent: '12.50',
      }),
    ).resolves.toEqual({ membership });

    expect(createMembershipTier.execute).toHaveBeenCalledWith({
      name: 'PLATINUM',
      minScore: 10000,
      discountPercent: 12.5,
    });
  });

  it('converts only the provided update fields', async () => {
    const membership = {
      mid: 2,
      name: 'SILVER',
      minScore: 1000,
      discountPercent: '7.50',
    };

    updateMembershipTier.execute.mockResolvedValue(membership);

    await controller.updateMembership({
      mid: 2,
      discountPercent: '7.50',
    });

    expect(updateMembershipTier.execute).toHaveBeenCalledWith({
      mid: 2,
      name: undefined,
      minScore: undefined,
      discountPercent: 7.5,
    });
  });

  it('maps duplicated customers to ALREADY_EXISTS', async () => {
    createCustomer.execute.mockRejectedValue(
      new CustomerAlreadyExistsError('uid'),
    );

    await expectRpcError(
      controller.create({
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      }),
      status.ALREADY_EXISTS,
    );
  });

  it('rejects an invalid discount as INVALID_ARGUMENT', async () => {
    await expectRpcError(
      controller.createMembership({
        name: 'PLATINUM',
        minScore: 10000,
        discountPercent: 'not-a-number',
      }),
      status.INVALID_ARGUMENT,
    );

    expect(createMembershipTier.execute).not.toHaveBeenCalled();
  });
});
