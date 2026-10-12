import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { CustomerResult, toCustomerResult } from '../dto/customer-result';
import { CustomerNotFoundError } from '../errors/customer.errors';

@Injectable()
export class GetCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(uid: number): Promise<CustomerResult> {
    const customer = await this.customers.findByUid(uid);

    if (!customer) {
      throw new CustomerNotFoundError(uid);
    }

    return toCustomerResult(customer);
  }
}
