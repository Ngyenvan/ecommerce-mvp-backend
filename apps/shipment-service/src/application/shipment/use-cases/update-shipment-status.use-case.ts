import { Injectable } from '@nestjs/common';
import { ShipmentStatus } from '../../../domain/shipment/shipment.entity';
import { ShipmentRepository } from '../../../domain/shipment/shipment.repository';
import { ShipmentResult, toShipmentResult } from '../dto/shipment-result';
import {
  InvalidShipmentRequestError,
  ShipmentNotFoundError,
} from '../errors/shipment-application.errors';

export interface UpdateShipmentStatusCommand {
  shipid: number;
  status: ShipmentStatus;
  note: string;
  updatedByUid: number;
}

@Injectable()
export class UpdateShipmentStatusUseCase {
  constructor(private readonly shipments: ShipmentRepository) {}

  async execute(command: UpdateShipmentStatusCommand): Promise<ShipmentResult> {
    if (!Number.isInteger(command.shipid) || command.shipid <= 0) {
      throw new InvalidShipmentRequestError(
        'Shipment id must be a positive integer',
      );
    }

    if (!Object.values(ShipmentStatus).includes(command.status)) {
      throw new InvalidShipmentRequestError('Shipment status is invalid');
    }

    const shipment = await this.shipments.findByShipid(command.shipid);

    if (!shipment) {
      throw new ShipmentNotFoundError(command.shipid);
    }

    shipment.updateStatus(command.status, command.note, command.updatedByUid);

    const updated = await this.shipments.update(shipment);

    return toShipmentResult(updated);
  }
}
