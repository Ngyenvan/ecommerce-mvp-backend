import { ShipmentStatus } from './shipment.entity';

export class InvalidShipmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidShipmentError';
  }
}

export class InvalidShipmentTransitionError extends Error {
  constructor(from: ShipmentStatus, to: ShipmentStatus) {
    super(`Cannot change shipment status from ${from} to ${to}`);
    this.name = 'InvalidShipmentTransitionError';
  }
}
