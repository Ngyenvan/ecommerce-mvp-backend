import { InventoryReservationEntity } from './inventory-reservation.entity';

export interface InventoryRequestItem {
  pid: number;
  qty: number;
}

export abstract class InventoryReservationRepository {
  abstract reserve(
    items: InventoryRequestItem[],
  ): Promise<InventoryReservationEntity>;

  abstract findById(
    reservationId: string,
  ): Promise<InventoryReservationEntity | null>;

  abstract save(
    reservation: InventoryReservationEntity,
  ): Promise<InventoryReservationEntity>;
}
