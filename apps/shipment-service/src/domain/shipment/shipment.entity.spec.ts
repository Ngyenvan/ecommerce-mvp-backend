import { ShipmentEntity, ShipmentStatus } from './shipment.entity';
import {
  InvalidShipmentError,
  InvalidShipmentTransitionError,
} from './shipment.errors';

describe('ShipmentEntity', () => {
  it('creates a pending shipment from an order', () => {
    const shipment = ShipmentEntity.createFromOrder(1001, 10);

    expect(shipment.oid).toBe(1001);
    expect(shipment.customerUid).toBe(10);
    expect(shipment.status).toBe(ShipmentStatus.PENDING);
    expect(shipment.tracking).toHaveLength(1);
    expect(shipment.tracking[0]).toMatchObject({
      status: ShipmentStatus.PENDING,
      updatedByUid: 0,
    });
  });

  it('rejects an invalid order id', () => {
    expect(() => ShipmentEntity.createFromOrder(0, 10)).toThrow(
      InvalidShipmentError,
    );
  });

  it('moves through the successful delivery lifecycle', () => {
    const shipment = ShipmentEntity.createFromOrder(1001, 10);

    shipment.updateStatus(ShipmentStatus.PROCESSING, 'Preparing package', 1);
    shipment.updateStatus(ShipmentStatus.SHIPPED, 'Package dispatched', 1);
    shipment.updateStatus(ShipmentStatus.DELIVERED, 'Delivered', 1);

    expect(shipment.status).toBe(ShipmentStatus.DELIVERED);
    expect(shipment.tracking).toHaveLength(4);
  });

  it('rejects an invalid status transition', () => {
    const shipment = ShipmentEntity.createFromOrder(1001, 10);

    expect(() =>
      shipment.updateStatus(
        ShipmentStatus.DELIVERED,
        'Invalid direct delivery',
        1,
      ),
    ).toThrow(InvalidShipmentTransitionError);
  });

  it('does not duplicate tracking for the current status', () => {
    const shipment = ShipmentEntity.createFromOrder(1001, 10);

    shipment.updateStatus(
      ShipmentStatus.PENDING,
      'Duplicate pending status',
      1,
    );

    expect(shipment.tracking).toHaveLength(1);
  });

  it('prevents changes after delivery', () => {
    const shipment = ShipmentEntity.createFromOrder(1001, 10);

    shipment.updateStatus(ShipmentStatus.PROCESSING, 'Processing', 1);
    shipment.updateStatus(ShipmentStatus.SHIPPED, 'Shipped', 1);
    shipment.updateStatus(ShipmentStatus.DELIVERED, 'Delivered', 1);

    expect(() =>
      shipment.updateStatus(
        ShipmentStatus.FAILED,
        'Cannot fail after delivery',
        1,
      ),
    ).toThrow(InvalidShipmentTransitionError);
  });

  it('normalizes the tracking note', () => {
    const shipment = ShipmentEntity.createFromOrder(1001, 10);

    shipment.updateStatus(
      ShipmentStatus.PROCESSING,
      '  Preparing   package  ',
      1,
    );

    expect(shipment.tracking.at(-1)?.note).toBe('Preparing package');
  });

  it('rejects an empty tracking note', () => {
    const shipment = ShipmentEntity.createFromOrder(1001, 10);

    expect(() =>
      shipment.updateStatus(ShipmentStatus.PROCESSING, '   ', 1),
    ).toThrow(InvalidShipmentError);
  });
});
