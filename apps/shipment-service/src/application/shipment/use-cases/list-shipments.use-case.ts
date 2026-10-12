import { Injectable } from '@nestjs/common';
import { ShipmentStatus } from '../../../domain/shipment/shipment.entity';
import { ShipmentRepository } from '../../../domain/shipment/shipment.repository';
import { ShipmentResult, toShipmentResult } from '../dto/shipment-result';
import { InvalidShipmentRequestError } from '../errors/shipment-application.errors';

export interface ListShipmentsRequest {
  page?: number;
  pageSize?: number;
  status?: ShipmentStatus;
  oid?: number;
}

export interface ShipmentListResult {
  shipments: ShipmentResult[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ListShipmentsUseCase {
  constructor(private readonly shipments: ShipmentRepository) {}

  async execute(request: ListShipmentsRequest): Promise<ShipmentListResult> {
    const page =
      request.page === 0 || request.page === undefined ? 1 : request.page;
    const pageSize =
      request.pageSize === 0 || request.pageSize === undefined
        ? 20
        : request.pageSize;

    if (!Number.isInteger(page) || page <= 0) {
      throw new InvalidShipmentRequestError('Page must be a positive integer');
    }

    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
      throw new InvalidShipmentRequestError(
        'Page size must be between 1 and 100',
      );
    }

    if (
      request.oid !== undefined &&
      (!Number.isInteger(request.oid) || request.oid <= 0)
    ) {
      throw new InvalidShipmentRequestError(
        'Order id must be a positive integer',
      );
    }

    if (
      request.status !== undefined &&
      !Object.values(ShipmentStatus).includes(request.status)
    ) {
      throw new InvalidShipmentRequestError('Shipment status is invalid');
    }

    const result = await this.shipments.list({
      page,
      pageSize,
      status: request.status,
      oid: request.oid,
    });

    return {
      shipments: result.shipments.map(toShipmentResult),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
