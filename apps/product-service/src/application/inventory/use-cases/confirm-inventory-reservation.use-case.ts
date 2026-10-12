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

@Injectable()
export class ConfirmInventoryReservationUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  async execute(reservationId: string): Promise<InventoryReservationResult> {
    const normalizedId = this.validateReservationId(reservationId);

    const reservation = await this.reservations.findById(normalizedId);

    if (!reservation) {
      throw new InventoryReservationNotFoundError(normalizedId);
    }

    if (reservation.status === InventoryReservationStatus.CONFIRMED) {
      return toInventoryReservationResult(reservation);
    }

    reservation.confirm();

    const savedReservation = await this.reservations.save(reservation);

    return toInventoryReservationResult(savedReservation);
  }

  private validateReservationId(reservationId: string): string {
    const normalizedId = reservationId.trim();

    if (normalizedId.length === 0 || normalizedId.length > 100) {
      throw new InvalidInventoryReservationRequestError(
        'Reservation id must contain between 1 and 100 characters',
      );
    }

    return normalizedId;
  }
}
