import { InvalidMoneyError } from './order.errors';

const MAX_MINOR_UNITS = 99_999_999_999_999n;

export class Money {
  private constructor(private readonly minorUnits: bigint) {}

  static zero(): Money {
    return new Money(0n);
  }

  static from(value: string): Money {
    const normalizedValue = value.trim();

    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalizedValue)) {
      throw new InvalidMoneyError(
        'Money must be a non-negative decimal with at most 2 decimal places',
      );
    }

    const [wholePart, decimalPart = ''] = normalizedValue.split('.');
    const minorUnits =
      BigInt(wholePart) * 100n + BigInt(decimalPart.padEnd(2, '0'));

    return Money.fromMinorUnits(minorUnits);
  }

  static fromMinorUnits(minorUnits: bigint): Money {
    if (minorUnits < 0n) {
      throw new InvalidMoneyError('Money must not be negative');
    }

    if (minorUnits > MAX_MINOR_UNITS) {
      throw new InvalidMoneyError('Money exceeds the supported database range');
    }

    return new Money(minorUnits);
  }

  add(other: Money): Money {
    return Money.fromMinorUnits(this.minorUnits + other.minorUnits);
  }

  subtract(other: Money): Money {
    return Money.fromMinorUnits(this.minorUnits - other.minorUnits);
  }

  multiply(multiplier: number): Money {
    if (!Number.isInteger(multiplier) || multiplier < 0) {
      throw new InvalidMoneyError(
        'Money multiplier must be a non-negative integer',
      );
    }

    return Money.fromMinorUnits(this.minorUnits * BigInt(multiplier));
  }

  percentage(basisPoints: number): Money {
    if (
      !Number.isInteger(basisPoints) ||
      basisPoints < 0 ||
      basisPoints > 10_000
    ) {
      throw new InvalidMoneyError('Basis points must be between 0 and 10000');
    }

    const roundedMinorUnits =
      (this.minorUnits * BigInt(basisPoints) + 5_000n) / 10_000n;

    return Money.fromMinorUnits(roundedMinorUnits);
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  equals(other: Money): boolean {
    return this.minorUnits === other.minorUnits;
  }

  toString(): string {
    const wholePart = this.minorUnits / 100n;
    const decimalPart = this.minorUnits % 100n;

    return `${wholePart}.${decimalPart.toString().padStart(2, '0')}`;
  }
}
