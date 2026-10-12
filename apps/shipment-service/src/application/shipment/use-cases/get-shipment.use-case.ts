import { Injectable } from '@nestjs/common';
import { ShipmentRepository } from '../../../domain/shipment/shipment.repository';
import { ShipmentResult, toShipmentResult } from '../dto/shipment-result';
import {
  InvalidShipmentRequestError,
  ShipmentNotFoundError,
} from '../errors/shipment-application.errors';

@Injectable()
export class GetShipmentUseCase {
  constructor(private readonly shipments: ShipmentRepository) {}

  async execute(shipid: number): Promise<ShipmentResult> {
    if (!Number.isInteger(shipid) || shipid <= 0) {
      throw new InvalidShipmentRequestError(
        'Shipment id must be a positive integer',
      );
    }

    const shipment = await this.shipments.findByShipid(shipid);

    if (!shipment) {
      throw new ShipmentNotFoundError(shipid);
    }

    return toShipmentResult(shipment);
  }
}
