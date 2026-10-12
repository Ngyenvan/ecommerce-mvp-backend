export class InvalidInventoryReservationRequestError extends Error {
  readonly code = 'INVALID_INVENTORY_RESERVATION_REQUEST';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidInventoryReservationRequestError';
  }
}

export class InventoryReservationNotFoundError extends Error {
  readonly code = 'INVENTORY_RESERVATION_NOT_FOUND';

  constructor(reservationId: string) {
    super(`Inventory reservation ${reservationId} was not found`);
    this.name = 'InventoryReservationNotFoundError';
  }
}
