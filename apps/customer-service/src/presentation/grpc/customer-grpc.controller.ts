import { Controller } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import {
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
  InvalidCustomerUpdateError,
  InvalidScoreAdjustmentError,
  MembershipConfigurationError,
} from '../../application/customer/errors/customer.errors';
import {
  InvalidMembershipUpdateError,
  MembershipAlreadyExistsError,
  MembershipNotFoundError,
} from '../../application/customer/errors/membership.errors';
import { AdjustCustomerScoreUseCase } from '../../application/customer/use-cases/adjust-customer-score.use-case';
import { CreateCustomerUseCase } from '../../application/customer/use-cases/create-customer.use-case';
import { GetCustomerMembershipUseCase } from '../../application/customer/use-cases/get-customer-membership.use-case';
import { GetCustomerUseCase } from '../../application/customer/use-cases/get-customer.use-case';
import { UpdateCustomerUseCase } from '../../application/customer/use-cases/update-customer.use-case';
import { CreateMembershipTierUseCase } from '../../application/customer/use-cases/create-membership-tier.use-case';
import { ListMembershipTiersUseCase } from '../../application/customer/use-cases/list-membership-tiers.use-case';
import { UpdateMembershipTierUseCase } from '../../application/customer/use-cases/update-membership-tier.use-case';

interface CreateCustomerRequest {
  uid: number;
  fullName: string;
  email: string;
  phone: string;
}

interface GetCustomerRequest {
  uid: number;
}

interface UpdateCustomerRequest {
  uid: number;
  fullName?: string;
  email?: string;
  phone?: string;
}

interface GetCustomerMembershipRequest {
  uid: number;
}

interface AdjustCustomerScoreRequest {
  uid: number;
  scoreDelta: number;
  reason: string;
  referenceId: string;
}

interface CreateMembershipTierRequest {
  name: string;
  minScore: number;
  discountPercent: string;
}

interface UpdateMembershipTierRequest {
  mid: number;
  name?: string;
  minScore?: number;
  discountPercent?: string;
}

@Controller()
export class CustomerGrpcController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly getCustomer: GetCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly getCustomerMembership: GetCustomerMembershipUseCase,
    private readonly adjustCustomerScore: AdjustCustomerScoreUseCase,
    private readonly listMembershipTiers: ListMembershipTiersUseCase,
    private readonly createMembershipTier: CreateMembershipTierUseCase,
    private readonly updateMembershipTier: UpdateMembershipTierUseCase,
  ) {}

  @GrpcMethod('CustomerService', 'CreateCustomer')
  async create(request: CreateCustomerRequest) {
    try {
      const customer = await this.createCustomer.execute(request);

      return { customer };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('CustomerService', 'GetCustomer')
  async findOne(request: GetCustomerRequest) {
    try {
      const customer = await this.getCustomer.execute(request.uid);

      return { customer };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('CustomerService', 'UpdateCustomer')
  async update(request: UpdateCustomerRequest) {
    try {
      const customer = await this.updateCustomer.execute(request);

      return { customer };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('CustomerService', 'GetCustomerMembership')
  async findMembership(request: GetCustomerMembershipRequest) {
    try {
      return await this.getCustomerMembership.execute(request.uid);
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('CustomerService', 'AdjustCustomerScore')
  async adjustScore(request: AdjustCustomerScoreRequest) {
    try {
      return await this.adjustCustomerScore.execute(request);
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('CustomerService', 'ListMembershipTiers')
  async listMemberships() {
    try {
      const memberships = await this.listMembershipTiers.execute();

      return { memberships };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('CustomerService', 'CreateMembershipTier')
  async createMembership(request: CreateMembershipTierRequest) {
    try {
      const membership = await this.createMembershipTier.execute({
        name: request.name,
        minScore: request.minScore,
        discountPercent: this.parseDiscountPercent(request.discountPercent),
      });

      return { membership };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('CustomerService', 'UpdateMembershipTier')
  async updateMembership(request: UpdateMembershipTierRequest) {
    try {
      const membership = await this.updateMembershipTier.execute({
        mid: request.mid,
        name: request.name,
        minScore: request.minScore,
        discountPercent:
          request.discountPercent === undefined
            ? undefined
            : this.parseDiscountPercent(request.discountPercent),
      });

      return { membership };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  private parseDiscountPercent(value: string): number {
    const normalizedValue = value.trim();
    const parsedValue = Number(normalizedValue);

    if (normalizedValue.length === 0 || !Number.isFinite(parsedValue)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Discount percent must be a valid number',
      });
    }

    return parsedValue;
  }

  private mapError(error: unknown): never {
    if (error instanceof RpcException) {
      throw error;
    }
    if (error instanceof CustomerAlreadyExistsError) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: error.message,
      });
    }

    if (error instanceof CustomerNotFoundError) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error.message,
      });
    }

    if (
      error instanceof InvalidCustomerUpdateError ||
      error instanceof InvalidScoreAdjustmentError
    ) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error.message,
      });
    }

    if (error instanceof MembershipAlreadyExistsError) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: error.message,
      });
    }

    if (error instanceof MembershipNotFoundError) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error.message,
      });
    }

    if (error instanceof InvalidMembershipUpdateError) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error.message,
      });
    }

    if (error instanceof MembershipConfigurationError) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: error.message,
      });
    }

    throw new RpcException({
      code: status.INTERNAL,
      message: 'Internal server error',
    });
  }
}
