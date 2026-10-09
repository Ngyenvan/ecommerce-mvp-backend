import { RoleName } from './role-name';

export interface RestoreUserProps {
  uid: number;
  username: string;
  passwordHash: string;
  role: RoleName;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  private constructor(
    private readonly userId: number | undefined,
    private readonly normalizedUsername: string,
    private readonly storedPasswordHash: string,
    private readonly assignedRole: RoleName,
    private active: boolean,
    private lastLogin: Date | null,
    private readonly created: Date,
    private updated: Date,
  ) {}

  static createNew(
    username: string,
    passwordHash: string,
  ): UserEntity {
    const normalizedUsername = this.normalizeUsername(username);
    this.validateUsername(normalizedUsername);
    this.validatePasswordHash(passwordHash);

    const now = new Date();

    return new UserEntity(
      undefined,
      normalizedUsername,
      passwordHash,
      RoleName.Customer,
      true,
      null,
      now,
      now,
    );
  }

  static restore(props: RestoreUserProps): UserEntity {
    if (!Number.isInteger(props.uid) || props.uid <= 0) {
      throw new Error('User id must be a positive integer');
    }

    const normalizedUsername = this.normalizeUsername(props.username);
    this.validateUsername(normalizedUsername);
    this.validatePasswordHash(props.passwordHash);

    return new UserEntity(
      props.uid,
      normalizedUsername,
      props.passwordHash,
      props.role,
      props.isActive,
      props.lastLoginAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  private static normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private static validateUsername(username: string): void {
    if (username.length < 3 || username.length > 50) {
      throw new Error(
        'Username must contain between 3 and 50 characters',
      );
    }
  }

  private static validatePasswordHash(passwordHash: string): void {
    if (passwordHash.length === 0) {
      throw new Error('Password hash is required');
    }
  }

  deactivate(): void {
    this.active = false;
    this.updated = new Date();
  }

  markLogin(at: Date = new Date()): void {
    this.lastLogin = at;
    this.updated = at;
  }

  get uid(): number | undefined {
    return this.userId;
  }

  get username(): string {
    return this.normalizedUsername;
  }

  get passwordHash(): string {
    return this.storedPasswordHash;
  }

  get role(): RoleName {
    return this.assignedRole;
  }

  get isActive(): boolean {
    return this.active;
  }

  get lastLoginAt(): Date | null {
    return this.lastLogin;
  }

  get createdAt(): Date {
    return this.created;
  }

  get updatedAt(): Date {
    return this.updated;
  }
}
