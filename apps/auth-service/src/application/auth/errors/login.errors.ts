export class InvalidCredentialsError extends Error {
  readonly code = 'AUTH_INVALID_CREDENTIALS';

  constructor() {
    super('Invalid username or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountDisabledError extends Error {
  readonly code = 'AUTH_ACCOUNT_DISABLED';

  constructor() {
    super('Account is disabled');
    this.name = 'AccountDisabledError';
  }
}
