import {
  InvalidShipmentError,
  InvalidShipmentTransitionError,
} from './shipment.errors';

export enum ShipmentStatus {
  PENDING = 'SHIPMENT_STATUS_PENDING',
  PROCESSING = 'SHIPMENT_STATUS_PROCESSING',
  SHIPPED = 'SHIPMENT_STATUS_SHIPPED',
  DELIVERED = 'SHIPMENT_STATUS_DELIVERED',
  FAILED = 'SHIPMENT_STATUS_FAILED',
  CANCELLED = 'SHIPMENT_STATUS_CANCELLED',
}

export interface TrackingEvent {
  status: ShipmentStatus;
  note: string;
  updatedByUid: number;
  occurredAt: Date;
}

export interface RestoreShipmentProps {
  shipid: number;
  oid: number;
  customerUid: number;
  status: ShipmentStatus;
  tracking: TrackingEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const allowedTransitions: Readonly<
  Record<ShipmentStatus, readonly ShipmentStatus[]>
> = {
  [ShipmentStatus.PENDING]: [
    ShipmentStatus.PROCESSING,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PROCESSING]: [
    ShipmentStatus.SHIPPED,
    ShipmentStatus.FAILED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.SHIPPED]: [ShipmentStatus.DELIVERED, ShipmentStatus.FAILED],
  [ShipmentStatus.FAILED]: [
    ShipmentStatus.PROCESSING,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export class ShipmentEntity {
  private constructor(
    private shipmentId: number | undefined,
    private readonly orderId: number,
    private readonly ownerUid: number,
    private currentStatus: ShipmentStatus,
    private readonly trackingEvents: TrackingEvent[],
    private readonly creationDate: Date,
    private modificationDate: Date,
  ) {}

  static createFromOrder(oid: number, customerUid: number): ShipmentEntity {
    this.validatePositiveInteger(oid, 'Order id');
    this.validatePositiveInteger(customerUid, 'Customer uid');

    const now = new Date();

    return new ShipmentEntity(
      undefined,
      oid,
      customerUid,
      ShipmentStatus.PENDING,
      [
        {
          status: ShipmentStatus.PENDING,
          note: 'Shipment created from OrderCreated event',
          updatedByUid: 0,
          occurredAt: now,
        },
      ],
      now,
      now,
    );
  }

  static restore(props: RestoreShipmentProps): ShipmentEntity {
    this.validatePositiveInteger(props.shipid, 'Shipment id');
    this.validatePositiveInteger(props.oid, 'Order id');
    this.validatePositiveInteger(props.customerUid, 'Customer uid');
    this.validateDate(props.createdAt, 'Created date');
    this.validateDate(props.updatedAt, 'Updated date');

    if (props.tracking.length === 0) {
      throw new InvalidShipmentError(
        'Shipment must contain at least one tracking event',
      );
    }

    const tracking = props.tracking.map((event) =>
      this.normalizeTrackingEvent(event, true),
    );

    if (tracking.at(-1)?.status !== props.status) {
      throw new InvalidShipmentError(
        'Latest tracking event must match shipment status',
      );
    }

    return new ShipmentEntity(
      props.shipid,
      props.oid,
      props.customerUid,
      props.status,
      tracking,
      new Date(props.createdAt),
      new Date(props.updatedAt),
    );
  }

  assignId(shipid: number): void {
    ShipmentEntity.validatePositiveInteger(shipid, 'Shipment id');

    if (this.shipmentId !== undefined && this.shipmentId !== shipid) {
      throw new InvalidShipmentError('Shipment id has already been assigned');
    }

    this.shipmentId = shipid;
  }

  updateStatus(
    nextStatus: ShipmentStatus,
    note: string,
    updatedByUid: number,
  ): void {
    ShipmentEntity.validatePositiveInteger(updatedByUid, 'Updated by uid');

    if (nextStatus === this.currentStatus) {
      return;
    }

    if (!allowedTransitions[this.currentStatus].includes(nextStatus)) {
      throw new InvalidShipmentTransitionError(this.currentStatus, nextStatus);
    }

    const normalizedNote = ShipmentEntity.normalizeNote(note);
    const now = new Date();

    this.currentStatus = nextStatus;
    this.modificationDate = now;
    this.trackingEvents.push({
      status: nextStatus,
      note: normalizedNote,
      updatedByUid,
      occurredAt: now,
    });
  }

  private static normalizeTrackingEvent(
    event: TrackingEvent,
    allowSystemUid: boolean,
  ): TrackingEvent {
    const minimumUid = allowSystemUid ? 0 : 1;

    if (
      !Number.isInteger(event.updatedByUid) ||
      event.updatedByUid < minimumUid
    ) {
      throw new InvalidShipmentError('Tracking updater uid is invalid');
    }

    this.validateDate(event.occurredAt, 'Tracking occurred date');

    return {
      status: event.status,
      note: this.normalizeNote(event.note),
      updatedByUid: event.updatedByUid,
      occurredAt: new Date(event.occurredAt),
    };
  }

  private static normalizeNote(note: string): string {
    const normalized = note.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0 || normalized.length > 500) {
      throw new InvalidShipmentError(
        'Tracking note must contain between 1 and 500 characters',
      );
    }

    return normalized;
  }

  private static validatePositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidShipmentError(`${field} must be a positive integer`);
    }
  }

  private static validateDate(value: Date, field: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new InvalidShipmentError(`${field} is invalid`);
    }
  }

  get shipid(): number | undefined {
    return this.shipmentId;
  }

  get oid(): number {
    return this.orderId;
  }

  get customerUid(): number {
    return this.ownerUid;
  }

  get status(): ShipmentStatus {
    return this.currentStatus;
  }

  get tracking(): TrackingEvent[] {
    return this.trackingEvents.map((event) => ({
      ...event,
      occurredAt: new Date(event.occurredAt),
    }));
  }

  get createdAt(): Date {
    return new Date(this.creationDate);
  }

  get updatedAt(): Date {
    return new Date(this.modificationDate);
  }
}
