export class InvalidInventoryReservationTransitionError extends Error {
  readonly code = 'INVALID_INVENTORY_RESERVATION_TRANSITION';

  constructor(currentStatus: string, requestedStatus: string) {
    super(
      `Cannot change inventory reservation from ${currentStatus} to ${requestedStatus}`,
    );
    this.name = 'InvalidInventoryReservationTransitionError';
  }
}

export class InsufficientInventoryError extends Error {
  readonly code = 'INSUFFICIENT_INVENTORY';

  constructor(readonly pid: number) {
    super(`Product ${pid} has insufficient inventory`);
    this.name = 'InsufficientInventoryError';
  }
}
