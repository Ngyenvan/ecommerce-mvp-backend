export type MembershipUniqueField = 'name' | 'minScore';

export class MembershipAlreadyExistsError extends Error {
  readonly code = 'MEMBERSHIP_ALREADY_EXISTS';

  constructor(readonly field: MembershipUniqueField) {
    super(`Membership ${field} already exists`);
    this.name = 'MembershipAlreadyExistsError';
  }
}
export class MembershipNotFoundError extends Error {
  readonly code = 'MEMBERSHIP_NOT_FOUND';

  constructor(mid: number) {
    super(`Membership ${mid} was not found`);
    this.name = 'MembershipNotFoundError';
  }
}
export class InvalidMembershipUpdateError extends Error {
  readonly code = 'INVALID_MEMBERSHIP_UPDATE';

  constructor() {
    super('At least one membership field must be provided');
    this.name = 'InvalidMembershipUpdateError';
  }
}
