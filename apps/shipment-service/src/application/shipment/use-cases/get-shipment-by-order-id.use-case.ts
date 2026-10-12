import { Injectable } from '@nestjs/common';
import { ShipmentRepository } from '../../../domain/shipment/shipment.repository';
import { ShipmentResult, toShipmentResult } from '../dto/shipment-result';
import {
  InvalidShipmentRequestError,
  ShipmentNotFoundError,
} from '../errors/shipment-application.errors';

@Injectable()
export class GetShipmentByOrderIdUseCase {
  constructor(private readonly shipments: ShipmentRepository) {}

  async execute(oid: number): Promise<ShipmentResult> {
    if (!Number.isInteger(oid) || oid <= 0) {
      throw new InvalidShipmentRequestError(
        'Order id must be a positive integer',
      );
    }

    const shipment = await this.shipments.findByOid(oid);

    if (!shipment) {
      throw new ShipmentNotFoundError(`for order ${oid}`);
    }

    return toShipmentResult(shipment);
  }
}
