import { ShipmentEntity, ShipmentStatus } from './shipment.entity';

export interface ListShipmentsQuery {
  page: number;
  pageSize: number;
  status?: ShipmentStatus;
  oid?: number;
}

export interface ShipmentPage {
  shipments: ShipmentEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class ShipmentRepository {
  abstract findByShipid(shipid: number): Promise<ShipmentEntity | null>;

  abstract findByOid(oid: number): Promise<ShipmentEntity | null>;

  abstract list(query: ListShipmentsQuery): Promise<ShipmentPage>;

  abstract create(shipment: ShipmentEntity): Promise<ShipmentEntity>;

  abstract update(shipment: ShipmentEntity): Promise<ShipmentEntity>;
}
