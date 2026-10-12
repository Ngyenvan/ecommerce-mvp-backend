export class InvalidShipmentRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidShipmentRequestError';
  }
}

export class ShipmentNotFoundError extends Error {
  constructor(identifier: string | number) {
    super(`Shipment ${identifier} was not found`);
    this.name = 'ShipmentNotFoundError';
  }
}
