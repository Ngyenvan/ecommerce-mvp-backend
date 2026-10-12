export class ProductNotFoundError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor(pid: number) {
    super(`Product ${pid} was not found`);
    this.name = 'ProductNotFoundError';
  }
}

export class InvalidProductListQueryError extends Error {
  readonly code = 'INVALID_PRODUCT_LIST_QUERY';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidProductListQueryError';
  }
}

export class InvalidProductUpdateError extends Error {
  readonly code = 'INVALID_PRODUCT_UPDATE';

  constructor() {
    super('At least one product field must be provided');
    this.name = 'InvalidProductUpdateError';
  }
}
