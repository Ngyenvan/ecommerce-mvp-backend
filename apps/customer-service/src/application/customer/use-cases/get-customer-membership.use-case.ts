import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import {
  CustomerMembershipResult,
  toCustomerMembershipResult,
} from '../dto/customer-membership-result';
import { CustomerNotFoundError } from '../errors/customer.errors';

@Injectable()
export class GetCustomerMembershipUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(uid: number): Promise<CustomerMembershipResult> {
    const customer = await this.customers.findByUid(uid);

    if (!customer) {
      throw new CustomerNotFoundError(uid);
    }

    return toCustomerMembershipResult(customer);
  }
}
