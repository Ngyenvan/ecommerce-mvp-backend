export class Money {
  private constructor(private readonly minorUnits: bigint) {}

  static from(value: string): Money {
    const normalizedValue = value.trim();

    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalizedValue)) {
      throw new Error(
        'Price must be a valid decimal with at most 2 decimal places',
      );
    }

    const [wholePart, decimalPart = ''] = normalizedValue.split('.');

    const minorUnits =
      BigInt(wholePart) * 100n + BigInt(decimalPart.padEnd(2, '0'));

    if (minorUnits <= 0n) {
      throw new Error('Price must be greater than zero');
    }

    return new Money(minorUnits);
  }

  toString(): string {
    const wholePart = this.minorUnits / 100n;
    const decimalPart = this.minorUnits % 100n;

    return `${wholePart}.${decimalPart.toString().padStart(2, '0')}`;
  }

  equals(other: Money): boolean {
    return this.minorUnits === other.minorUnits;
  }
}
