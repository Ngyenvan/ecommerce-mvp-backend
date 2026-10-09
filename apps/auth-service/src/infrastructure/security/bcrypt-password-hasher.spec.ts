import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('hashes and verifies a password', async () => {
    const password = 'StrongPassword123!';
    const passwordHash = await hasher.hash(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
    await expect(
      hasher.matches(password, passwordHash),
    ).resolves.toBe(true);
    await expect(
      hasher.matches('wrong-password', passwordHash),
    ).resolves.toBe(false);
  });

  it('rejects passwords longer than 72 bytes', async () => {
    await expect(
      hasher.hash('a'.repeat(73)),
    ).rejects.toThrow('Password must not exceed 72 bytes');
  });
});
