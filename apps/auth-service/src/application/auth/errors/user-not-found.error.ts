export class UserNotFoundError extends Error {
  readonly code = 'AUTH_USER_NOT_FOUND';

  constructor() {
    super('User was not found');
    this.name = 'UserNotFoundError';
  }
}
