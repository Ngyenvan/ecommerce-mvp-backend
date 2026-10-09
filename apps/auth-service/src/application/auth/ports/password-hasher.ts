export abstract class PasswordHasher {
  abstract hash(plainText: string): Promise<string>;

  abstract matches(
    plainText: string,
    passwordHash: string,
  ): Promise<boolean>;
}
