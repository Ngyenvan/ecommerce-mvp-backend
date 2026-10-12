import { Injectable } from '@nestjs/common';
import { InventoryReservationStatus } from '../../../domain/inventory/inventory-reservation.entity';
import { InventoryReservationRepository } from '../../../domain/inventory/inventory-reservation.repository';
import {
  InventoryReservationResult,
  toInventoryReservationResult,
} from '../dto/inventory-result';
import {
  InvalidInventoryReservationRequestError,
  InventoryReservationNotFoundError,
} from '../errors/inventory.errors';

export interface ReleaseInventoryReservationCommand {
  reservationId: string;
  reason: string;
}

@Injectable()
export class ReleaseInventoryReservationUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  async execute(
    command: ReleaseInventoryReservationCommand,
  ): Promise<InventoryReservationResult> {
    const reservationId = command.reservationId.trim();
    const reason = command.reason.trim();

    if (reservationId.length === 0 || reservationId.length > 100) {
      throw new InvalidInventoryReservationRequestError(
        'Reservation id must contain between 1 and 100 characters',
      );
    }

    if (reason.length === 0 || reason.length > 255) {
      throw new InvalidInventoryReservationRequestError(
        'Release reason must contain between 1 and 255 characters',
      );
    }

    const reservation = await this.reservations.findById(reservationId);

    if (!reservation) {
      throw new InventoryReservationNotFoundError(reservationId);
    }

    if (reservation.status === InventoryReservationStatus.RELEASED) {
      return toInventoryReservationResult(reservation);
    }

    reservation.release(reason);

    const savedReservation = await this.reservations.save(reservation);

    return toInventoryReservationResult(savedReservation);
  }
}
