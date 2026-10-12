import { Injectable } from '@nestjs/common';
import { ShipmentEntity } from '../../../domain/shipment/shipment.entity';
import { ShipmentRepository } from '../../../domain/shipment/shipment.repository';
import { ShipmentResult, toShipmentResult } from '../dto/shipment-result';
import { InvalidShipmentRequestError } from '../errors/shipment-application.errors';

export interface CreateShipmentFromOrderCommand {
  oid: number;
  customerUid: number;
}

@Injectable()
export class CreateShipmentFromOrderUseCase {
  constructor(private readonly shipments: ShipmentRepository) {}

  async execute(
    command: CreateShipmentFromOrderCommand,
  ): Promise<ShipmentResult> {
    this.validatePositiveInteger(command.oid, 'Order id');
    this.validatePositiveInteger(command.customerUid, 'Customer uid');

    const existing = await this.shipments.findByOid(command.oid);

    if (existing) {
      return toShipmentResult(existing);
    }

    const shipment = ShipmentEntity.createFromOrder(
      command.oid,
      command.customerUid,
    );

    try {
      const created = await this.shipments.create(shipment);

      return toShipmentResult(created);
    } catch (error: unknown) {
      const concurrentlyCreated = await this.shipments.findByOid(command.oid);

      if (concurrentlyCreated) {
        return toShipmentResult(concurrentlyCreated);
      }

      throw error;
    }
  }

  private validatePositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidShipmentRequestError(
        `${field} must be a positive integer`,
      );
    }
  }
}
