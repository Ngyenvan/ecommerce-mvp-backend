export interface InventoryRequestItem {
  pid: number;
  qty: number;
}

export interface ReservedProduct {
  pid: number;
  pname: string;
  unitPrice: string;
  qty: number;
}

export interface InventoryReservation {
  reservationId: string;
  products: ReservedProduct[];
}

export abstract class InventoryGateway {
  abstract reserve(
    items: InventoryRequestItem[],
  ): Promise<InventoryReservation>;
  abstract confirm(reservationId: string): Promise<void>;
  abstract release(reservationId: string, reason: string): Promise<void>;
}
