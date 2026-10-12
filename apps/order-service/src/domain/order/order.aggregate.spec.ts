import { OrderAggregate, OrderStatus } from './order.aggregate';
import { InvalidOrderError } from './order.errors';

describe('OrderAggregate', () => {
  it('calculates subtotal, discount amount and total amount', () => {
    const order = OrderAggregate.create({
      uid: 1,
      clientRequestId: 'checkout-001',
      inventoryReservationId: 'reservation-001',
      membershipScore: 1_500,
      discountPercent: '10',
      items: [
        { pid: 1, pname: 'Laptop', qty: 2, unitPrice: '1500.00' },
        { pid: 2, pname: 'Mouse', qty: 1, unitPrice: '25.00' },
      ],
    });

    expect(order.subtotal).toBe('3025.00');
    expect(order.discountPercent).toBe('10.00');
    expect(order.discountAmount).toBe('302.50');
    expect(order.totalAmount).toBe('2722.50');
    expect(order.status).toBe(OrderStatus.CREATED);
  });

  it('stores product names and prices as immutable order snapshots', () => {
    const order = OrderAggregate.create({
      uid: 1,
      clientRequestId: 'checkout-002',
      inventoryReservationId: 'reservation-002',
      membershipScore: 0,
      discountPercent: '0',
      items: [
        { pid: 1, pname: '  Mechanical   Keyboard ', qty: 2, unitPrice: '5' },
      ],
    });

    expect(order.items[0]).toMatchObject({
      pid: 1,
      pname: 'Mechanical Keyboard',
      qty: 2,
      unitPrice: '5.00',
      lineTotal: '10.00',
    });
  });

  it('rejects duplicate products', () => {
    expect(() =>
      OrderAggregate.create({
        uid: 1,
        clientRequestId: 'checkout-003',
        inventoryReservationId: 'reservation-003',
        membershipScore: 0,
        discountPercent: '0',
        items: [
          { pid: 1, pname: 'Laptop', qty: 1, unitPrice: '100.00' },
          { pid: 1, pname: 'Laptop', qty: 2, unitPrice: '100.00' },
        ],
      }),
    ).toThrow(InvalidOrderError);
  });

  it('rejects an empty order or invalid quantity', () => {
    expect(() =>
      OrderAggregate.create({
        uid: 1,
        clientRequestId: 'checkout-004',
        inventoryReservationId: 'reservation-004',
        membershipScore: 0,
        discountPercent: '0',
        items: [],
      }),
    ).toThrow(InvalidOrderError);

    expect(() =>
      OrderAggregate.create({
        uid: 1,
        clientRequestId: 'checkout-005',
        inventoryReservationId: 'reservation-005',
        membershipScore: 0,
        discountPercent: '0',
        items: [{ pid: 1, pname: 'Laptop', qty: 0, unitPrice: '100.00' }],
      }),
    ).toThrow(InvalidOrderError);
  });

  it('cancels an order idempotently', () => {
    const order = OrderAggregate.create({
      uid: 1,
      clientRequestId: 'checkout-006',
      inventoryReservationId: 'reservation-006',
      membershipScore: 0,
      discountPercent: '0',
      items: [{ pid: 1, pname: 'Laptop', qty: 1, unitPrice: '100.00' }],
    });

    order.cancel();
    order.cancel();

    expect(order.status).toBe(OrderStatus.CANCELLED);
  });
});
