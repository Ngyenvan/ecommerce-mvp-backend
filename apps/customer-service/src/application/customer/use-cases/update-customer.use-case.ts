import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { CustomerResult, toCustomerResult } from '../dto/customer-result';
import {
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
  InvalidCustomerUpdateError,
} from '../errors/customer.errors';

export interface UpdateCustomerCommand {
  uid: number;
  fullName?: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class UpdateCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(command: UpdateCustomerCommand): Promise<CustomerResult> {
    if (
      command.fullName === undefined &&
      command.email === undefined &&
      command.phone === undefined
    ) {
      throw new InvalidCustomerUpdateError();
    }

    const customer = await this.customers.findByUid(command.uid);

    if (!customer) {
      throw new CustomerNotFoundError(command.uid);
    }

    const [emailOwner, phoneOwner] = await Promise.all([
      command.email === undefined
        ? Promise.resolve(null)
        : this.customers.findByEmail(command.email),
      command.phone === undefined
        ? Promise.resolve(null)
        : this.customers.findByPhone(command.phone),
    ]);

    if (emailOwner && emailOwner.uid !== customer.uid) {
      throw new CustomerAlreadyExistsError('email');
    }

    if (phoneOwner && phoneOwner.uid !== customer.uid) {
      throw new CustomerAlreadyExistsError('phone');
    }

    customer.updateProfile({
      fullName: command.fullName,
      email: command.email,
      phone: command.phone,
    });

    const savedCustomer = await this.customers.update(customer);

    return toCustomerResult(savedCustomer);
  }
}
