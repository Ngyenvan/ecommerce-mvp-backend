import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/customer/customer.repository';
import { MembershipRepository } from '../../../domain/customer/membership.repository';
import {
  CustomerMembershipResult,
  toCustomerMembershipResult,
} from '../dto/customer-membership-result';
import {
  CustomerNotFoundError,
  InvalidScoreAdjustmentError,
  MembershipConfigurationError,
} from '../errors/customer.errors';

export interface AdjustCustomerScoreCommand {
  uid: number;
  scoreDelta: number;
  reason: string;
  referenceId: string;
}

@Injectable()
export class AdjustCustomerScoreUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(
    command: AdjustCustomerScoreCommand,
  ): Promise<CustomerMembershipResult> {
    const reason = command.reason.trim();
    const referenceId = command.referenceId.trim();

    this.validateCommand(command.scoreDelta, reason, referenceId);

    const customer = await this.customers.findByUid(command.uid);

    if (!customer) {
      throw new CustomerNotFoundError(command.uid);
    }

    const alreadyProcessed = await this.customers.hasScoreAdjustment(
      command.uid,
      referenceId,
    );

    if (alreadyProcessed) {
      return toCustomerMembershipResult(customer);
    }

    const tiers = await this.memberships.findAll();

    if (tiers.length === 0) {
      throw new MembershipConfigurationError();
    }

    customer.adjustScore(command.scoreDelta, tiers);

    const applied = await this.customers.saveScoreAdjustment({
      customer,
      scoreDelta: command.scoreDelta,
      reason,
      referenceId,
    });

    if (!applied) {
      const persistedCustomer = await this.customers.findByUid(command.uid);

      if (!persistedCustomer) {
        throw new CustomerNotFoundError(command.uid);
      }

      return toCustomerMembershipResult(persistedCustomer);
    }

    return toCustomerMembershipResult(customer);
  }

  private validateCommand(
    scoreDelta: number,
    reason: string,
    referenceId: string,
  ): void {
    if (!Number.isInteger(scoreDelta) || scoreDelta === 0) {
      throw new InvalidScoreAdjustmentError(
        'Score delta must be a non-zero integer',
      );
    }

    if (reason.length === 0 || reason.length > 255) {
      throw new InvalidScoreAdjustmentError(
        'Reason must contain between 1 and 255 characters',
      );
    }

    if (referenceId.length === 0 || referenceId.length > 100) {
      throw new InvalidScoreAdjustmentError(
        'Reference id must contain between 1 and 100 characters',
      );
    }
  }
}
