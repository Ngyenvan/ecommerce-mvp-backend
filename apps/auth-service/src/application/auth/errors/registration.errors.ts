export class UsernameAlreadyExistsError extends Error {
  readonly code = 'AUTH_USERNAME_ALREADY_EXISTS';

  constructor() {
    super('Username already exists');
    this.name = 'UsernameAlreadyExistsError';
  }
}

export class InvalidPasswordError extends Error {
  readonly code = 'AUTH_INVALID_PASSWORD';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}
