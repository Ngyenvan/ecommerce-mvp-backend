export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND';

  constructor(oid: number) {
    super(`Order ${oid} was not found`);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderAccessDeniedError extends Error {
  readonly code = 'ORDER_ACCESS_DENIED';

  constructor() {
    super('The requester is not allowed to access this order');
    this.name = 'OrderAccessDeniedError';
  }
}

export class InvalidOrderRequestError extends Error {
  readonly code = 'INVALID_ORDER_REQUEST';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderRequestError';
  }
}

export class OrderRequestConflictError extends Error {
  readonly code = 'ORDER_REQUEST_CONFLICT';

  constructor() {
    super('Client request id is already used by another customer');
    this.name = 'OrderRequestConflictError';
  }
}

export class DownstreamServiceError extends Error {
  readonly code = 'DOWNSTREAM_SERVICE_ERROR';

  constructor(
    readonly serviceName: 'Customer Service' | 'Product Service',
    readonly grpcCode: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'DownstreamServiceError';
  }
}

export class InventoryConfirmationPendingError extends Error {
  readonly code = 'INVENTORY_CONFIRMATION_PENDING';

  constructor(readonly oid: number) {
    super(
      `Order ${oid} was saved but inventory confirmation is pending; retry with the same client request id`,
    );
    this.name = 'InventoryConfirmationPendingError';
  }
}
