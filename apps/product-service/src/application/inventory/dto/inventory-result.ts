import {
  InventoryReservationEntity,
  InventoryReservationStatus,
  ReservedProductSnapshot,
} from '../../../domain/inventory/inventory-reservation.entity';

export interface InventoryReservationResult {
  reservationId: string;
  status: InventoryReservationStatus;
}

export interface ReserveInventoryResult extends InventoryReservationResult {
  products: ReservedProductSnapshot[];
}

export function toInventoryReservationResult(
  reservation: InventoryReservationEntity,
): InventoryReservationResult {
  return {
    reservationId: reservation.reservationId,
    status: reservation.status,
  };
}

export function toReserveInventoryResult(
  reservation: InventoryReservationEntity,
): ReserveInventoryResult {
  return {
    ...toInventoryReservationResult(reservation),
    products: reservation.products,
  };
}
