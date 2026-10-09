import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PasswordHasher } from '../../application/auth/ports/password-hasher';

@Injectable()
export class BcryptPasswordHasher extends PasswordHasher {
  private static readonly SALT_ROUNDS = 12;

  async hash(plainText: string): Promise<string> {
    this.ensureSupportedLength(plainText);

    return bcrypt.hash(
      plainText,
      BcryptPasswordHasher.SALT_ROUNDS,
    );
  }

  async matches(
    plainText: string,
    passwordHash: string,
  ): Promise<boolean> {
    this.ensureSupportedLength(plainText);

    return bcrypt.compare(plainText, passwordHash);
  }

  private ensureSupportedLength(plainText: string): void {
    if (bcrypt.truncates(plainText)) {
      throw new Error('Password must not exceed 72 bytes');
    }
  }
}
