import { Money } from '../product/money.value-object';
import { InvalidInventoryReservationTransitionError } from './inventory-reservation.errors';

export enum InventoryReservationStatus {
  RESERVED = 'INVENTORY_RESERVATION_STATUS_RESERVED',
  CONFIRMED = 'INVENTORY_RESERVATION_STATUS_CONFIRMED',
  RELEASED = 'INVENTORY_RESERVATION_STATUS_RELEASED',
}

export interface ReservedProductSnapshot {
  pid: number;
  pname: string;
  unitPrice: string;
  qty: number;
}

export interface RestoreInventoryReservationProps {
  reservationId: string;
  status: InventoryReservationStatus;
  products: ReservedProductSnapshot[];
  releaseReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InventoryReservationEntity {
  private constructor(
    private readonly id: string,
    private reservationStatus: InventoryReservationStatus,
    private readonly reservedProducts: ReservedProductSnapshot[],
    private reason: string | undefined,
    private readonly creationDate: Date,
    private modificationDate: Date,
  ) {}

  static createReserved(
    reservationId: string,
    products: ReservedProductSnapshot[],
  ): InventoryReservationEntity {
    const normalizedId = this.normalizeReservationId(reservationId);

    const normalizedProducts = this.normalizeProducts(products);

    const now = new Date();

    return new InventoryReservationEntity(
      normalizedId,
      InventoryReservationStatus.RESERVED,
      normalizedProducts,
      undefined,
      now,
      now,
    );
  }

  static restore(
    props: RestoreInventoryReservationProps,
  ): InventoryReservationEntity {
    const normalizedId = this.normalizeReservationId(props.reservationId);

    const normalizedProducts = this.normalizeProducts(props.products);

    if (
      !(props.createdAt instanceof Date) ||
      Number.isNaN(props.createdAt.getTime()) ||
      !(props.updatedAt instanceof Date) ||
      Number.isNaN(props.updatedAt.getTime())
    ) {
      throw new Error('Inventory reservation dates are invalid');
    }

    return new InventoryReservationEntity(
      normalizedId,
      props.status,
      normalizedProducts,
      props.releaseReason?.trim(),
      new Date(props.createdAt),
      new Date(props.updatedAt),
    );
  }

  confirm(): void {
    if (this.reservationStatus === InventoryReservationStatus.CONFIRMED) {
      return;
    }

    if (this.reservationStatus !== InventoryReservationStatus.RESERVED) {
      throw new InvalidInventoryReservationTransitionError(
        this.reservationStatus,
        InventoryReservationStatus.CONFIRMED,
      );
    }

    this.reservationStatus = InventoryReservationStatus.CONFIRMED;
    this.modificationDate = new Date();
  }

  release(releaseReason: string): void {
    if (this.reservationStatus === InventoryReservationStatus.RELEASED) {
      return;
    }

    if (this.reservationStatus !== InventoryReservationStatus.RESERVED) {
      throw new InvalidInventoryReservationTransitionError(
        this.reservationStatus,
        InventoryReservationStatus.RELEASED,
      );
    }

    const normalizedReason = releaseReason.trim();

    if (normalizedReason.length === 0 || normalizedReason.length > 255) {
      throw new Error(
        'Release reason must contain between 1 and 255 characters',
      );
    }

    this.reason = normalizedReason;
    this.reservationStatus = InventoryReservationStatus.RELEASED;
    this.modificationDate = new Date();
  }

  private static normalizeReservationId(reservationId: string): string {
    const normalizedId = reservationId.trim();

    if (normalizedId.length === 0 || normalizedId.length > 100) {
      throw new Error(
        'Reservation id must contain between 1 and 100 characters',
      );
    }

    return normalizedId;
  }

  private static normalizeProducts(
    products: ReservedProductSnapshot[],
  ): ReservedProductSnapshot[] {
    if (products.length === 0) {
      throw new Error(
        'Inventory reservation must contain at least one product',
      );
    }

    return products.map((product) => {
      if (!Number.isInteger(product.pid) || product.pid <= 0) {
        throw new Error('Reserved product id must be a positive integer');
      }

      if (!Number.isInteger(product.qty) || product.qty <= 0) {
        throw new Error('Reserved quantity must be a positive integer');
      }

      const pname = product.pname.trim().replace(/\s+/g, ' ');

      if (pname.length === 0 || pname.length > 100) {
        throw new Error('Reserved product name is invalid');
      }

      return {
        pid: product.pid,
        pname,
        unitPrice: Money.from(product.unitPrice).toString(),
        qty: product.qty,
      };
    });
  }

  get reservationId(): string {
    return this.id;
  }

  get status(): InventoryReservationStatus {
    return this.reservationStatus;
  }

  get products(): ReservedProductSnapshot[] {
    return this.reservedProducts.map((product) => ({
      ...product,
    }));
  }

  get releaseReason(): string | undefined {
    return this.reason;
  }

  get createdAt(): Date {
    return new Date(this.creationDate);
  }

  get updatedAt(): Date {
    return new Date(this.modificationDate);
  }
}
