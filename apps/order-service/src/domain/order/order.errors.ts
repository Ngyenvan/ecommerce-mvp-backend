export class InvalidMoneyError extends Error {
  readonly code = 'INVALID_MONEY';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

export class InvalidDiscountError extends Error {
  readonly code = 'INVALID_DISCOUNT';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidDiscountError';
  }
}

export class InvalidOrderError extends Error {
  readonly code = 'INVALID_ORDER';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderError';
  }
}
