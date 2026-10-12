import { Injectable } from '@nestjs/common';
import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { MembershipRepository } from '../../../domain/customer/membership.repository';
import {
  CustomerAlreadyExistsError,
  MembershipConfigurationError,
} from '../errors/customer.errors';
import { CustomerResult, toCustomerResult } from '../dto/customer-result';

export interface CreateCustomerCommand {
  uid: number;
  fullName: string;
  email: string;
  phone: string;
}

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(command: CreateCustomerCommand): Promise<CustomerResult> {
    const tiers = await this.memberships.findAll();

    if (tiers.length === 0) {
      throw new MembershipConfigurationError();
    }

    const customer = CustomerEntity.createNew(command, tiers);

    const [customerWithUid, customerWithEmail, customerWithPhone] =
      await Promise.all([
        this.customers.findByUid(customer.uid),
        this.customers.findByEmail(customer.email),
        this.customers.findByPhone(customer.phone),
      ]);

    if (customerWithUid) {
      throw new CustomerAlreadyExistsError('uid');
    }

    if (customerWithEmail) {
      throw new CustomerAlreadyExistsError('email');
    }

    if (customerWithPhone) {
      throw new CustomerAlreadyExistsError('phone');
    }

    const savedCustomer = await this.customers.create(customer);

    return toCustomerResult(savedCustomer);
  }
}
