export type CustomerUniqueField = 'uid' | 'email' | 'phone';

export class CustomerAlreadyExistsError extends Error {
  readonly code = 'CUSTOMER_ALREADY_EXISTS';

  constructor(readonly field: CustomerUniqueField) {
    super(`Customer ${field} already exists`);
    this.name = 'CustomerAlreadyExistsError';
  }
}

export class MembershipConfigurationError extends Error {
  readonly code = 'MEMBERSHIP_CONFIGURATION_ERROR';

  constructor() {
    super('No membership tiers are configured');
    this.name = 'MembershipConfigurationError';
  }
}
export class CustomerNotFoundError extends Error {
  readonly code = 'CUSTOMER_NOT_FOUND';

  constructor(uid: number) {
    super(`Customer ${uid} was not found`);
    this.name = 'CustomerNotFoundError';
  }
}
export class InvalidCustomerUpdateError extends Error {
  readonly code = 'INVALID_CUSTOMER_UPDATE';

  constructor() {
    super('At least one customer field must be provided');
    this.name = 'InvalidCustomerUpdateError';
  }
}
export class InvalidScoreAdjustmentError extends Error {
  readonly code = 'INVALID_SCORE_ADJUSTMENT';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidScoreAdjustmentError';
  }
}
