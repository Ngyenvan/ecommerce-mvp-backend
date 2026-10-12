import {
  ShipmentEntity,
  ShipmentStatus,
} from '../../../domain/shipment/shipment.entity';

export interface ShipmentResult {
  shipid: number;
  oid: number;
  customerUid: number;
  status: ShipmentStatus;
  tracking: Array<{
    status: ShipmentStatus;
    note: string;
    updatedByUid: number;
    occurredAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export function toShipmentResult(shipment: ShipmentEntity): ShipmentResult {
  if (shipment.shipid === undefined) {
    throw new Error('Persisted shipment id is missing');
  }

  return {
    shipid: shipment.shipid,
    oid: shipment.oid,
    customerUid: shipment.customerUid,
    status: shipment.status,
    tracking: shipment.tracking.map((event) => ({
      status: event.status,
      note: event.note,
      updatedByUid: event.updatedByUid,
      occurredAt: event.occurredAt.toISOString(),
    })),
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  };
}
