import { RoleName } from './role-name';
import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  const passwordHash = 'a-valid-password-hash';

  it('normalizes a new username and assigns CUSTOMER role', () => {
    const user = UserEntity.createNew(
      '  NewCustomer  ',
      passwordHash,
    );

    expect(user.uid).toBeUndefined();
    expect(user.username).toBe('newcustomer');
    expect(user.role).toBe(RoleName.Customer);
    expect(user.isActive).toBe(true);
  });

  it('rejects a username shorter than three characters', () => {
    expect(() =>
      UserEntity.createNew('ab', passwordHash),
    ).toThrow('Username must contain between 3 and 50 characters');
  });

  it('rejects an empty password hash', () => {
    expect(() =>
      UserEntity.createNew('customer', ''),
    ).toThrow('Password hash is required');
  });

  it('can deactivate a user', () => {
    const user = UserEntity.createNew('customer', passwordHash);

    user.deactivate();

    expect(user.isActive).toBe(false);
  });

  it('records the last login time', () => {
    const user = UserEntity.createNew('customer', passwordHash);
    const loginTime = new Date('2026-10-09T10:00:00.000Z');

    user.markLogin(loginTime);

    expect(user.lastLoginAt).toEqual(loginTime);
    expect(user.updatedAt).toEqual(loginTime);
  });
});
