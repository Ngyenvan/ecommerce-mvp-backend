import { Injectable } from '@nestjs/common';
import {
  InventoryRequestItem,
  InventoryReservationRepository,
} from '../../../domain/inventory/inventory-reservation.repository';
import {
  ReserveInventoryResult,
  toReserveInventoryResult,
} from '../dto/inventory-result';
import { InvalidInventoryReservationRequestError } from '../errors/inventory.errors';

export interface ReserveInventoryCommand {
  items: InventoryRequestItem[];
}

@Injectable()
export class ReserveInventoryUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  async execute(
    command: ReserveInventoryCommand,
  ): Promise<ReserveInventoryResult> {
    if (
      !Array.isArray(command.items) ||
      command.items.length === 0 ||
      command.items.length > 100
    ) {
      throw new InvalidInventoryReservationRequestError(
        'Reservation must contain between 1 and 100 items',
      );
    }

    const seenProductIds = new Set<number>();

    for (const item of command.items) {
      if (
        !Number.isInteger(item.pid) ||
        item.pid <= 0 ||
        !Number.isInteger(item.qty) ||
        item.qty <= 0
      ) {
        throw new InvalidInventoryReservationRequestError(
          'Product id and quantity must be positive integers',
        );
      }

      if (seenProductIds.has(item.pid)) {
        throw new InvalidInventoryReservationRequestError(
          `Product ${item.pid} appears more than once`,
        );
      }

      seenProductIds.add(item.pid);
    }

    const reservation = await this.reservations.reserve(
      command.items.map((item) => ({
        ...item,
      })),
    );

    return toReserveInventoryResult(reservation);
  }
}
