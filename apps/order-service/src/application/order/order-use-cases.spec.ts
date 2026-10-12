import {
  OrderAggregate,
  OrderStatus,
} from '../../domain/order/order.aggregate';
import { OrderRepository } from '../../domain/order/order.repository';
import {
  InventoryConfirmationPendingError,
  OrderAccessDeniedError,
} from './errors/order-application.errors';
import { CustomerMembershipGateway } from './ports/customer-membership.gateway';
import { InventoryGateway } from './ports/inventory.gateway';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { GetOrderUseCase } from './use-cases/get-order.use-case';
import { ListOrdersUseCase } from './use-cases/list-orders.use-case';

function persistedOrder(uid = 10): OrderAggregate {
  return OrderAggregate.restore({
    oid: 1001,
    uid,
    clientRequestId: 'checkout-001',
    inventoryReservationId: 'reservation-001',
    discountPercent: '10.00',
    items: [
      { pid: 1, pname: 'Laptop', qty: 2, unitPrice: '1500.00' },
      { pid: 2, pname: 'Mouse', qty: 1, unitPrice: '25.00' },
    ],
    status: OrderStatus.CREATED,
    createdAt: new Date('2026-10-12T00:00:00.000Z'),
    updatedAt: new Date('2026-10-12T00:00:00.000Z'),
  });
}

describe('Order application use cases', () => {
  const orders = {
    findByOid: jest.fn(),
    findByClientRequestId: jest.fn(),
    list: jest.fn(),
    createWithOutbox: jest.fn(),
    markReadyForPublishing: jest.fn(),
  };

  const customers = {
    getMembership: jest.fn(),
  };

  const inventory = {
    reserve: jest.fn(),
    confirm: jest.fn(),
    release: jest.fn(),
  };

  let createOrder: CreateOrderUseCase;
  let getOrder: GetOrderUseCase;
  let listOrders: ListOrdersUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    createOrder = new CreateOrderUseCase(
      orders as unknown as OrderRepository,
      customers as unknown as CustomerMembershipGateway,
      inventory as unknown as InventoryGateway,
    );
    getOrder = new GetOrderUseCase(orders as unknown as OrderRepository);
    listOrders = new ListOrdersUseCase(orders as unknown as OrderRepository);
  });

  it('creates an order from membership and reserved product snapshots', async () => {
    orders.findByClientRequestId.mockResolvedValue(null);
    customers.getMembership.mockResolvedValue({
      uid: 10,
      score: 1_500,
      discountPercent: '10.00',
    });
    inventory.reserve.mockResolvedValue({
      reservationId: 'reservation-001',
      products: [
        { pid: 1, pname: 'Laptop', qty: 2, unitPrice: '1500.00' },
        { pid: 2, pname: 'Mouse', qty: 1, unitPrice: '25.00' },
      ],
    });
    orders.createWithOutbox.mockResolvedValue(persistedOrder());
    inventory.confirm.mockResolvedValue(undefined);
    orders.markReadyForPublishing.mockResolvedValue(undefined);

    const result = await createOrder.execute({
      uid: 10,
      clientRequestId: 'checkout-001',
      items: [
        { pid: 1, qty: 2 },
        { pid: 2, qty: 1 },
      ],
    });

    expect(result).toMatchObject({
      oid: 1001,
      subtotal: '3025.00',
      discountAmount: '302.50',
      totalAmount: '2722.50',
    });
    expect(inventory.confirm).toHaveBeenCalledWith('reservation-001');
    expect(orders.markReadyForPublishing).toHaveBeenCalledWith(1001);
  });

  it('returns an existing idempotent order without reserving stock twice', async () => {
    orders.findByClientRequestId.mockResolvedValue(persistedOrder());
    inventory.confirm.mockResolvedValue(undefined);
    orders.markReadyForPublishing.mockResolvedValue(undefined);

    const result = await createOrder.execute({
      uid: 10,
      clientRequestId: 'checkout-001',
      items: [{ pid: 1, qty: 2 }],
    });

    expect(result.oid).toBe(1001);
    expect(customers.getMembership).not.toHaveBeenCalled();
    expect(inventory.reserve).not.toHaveBeenCalled();
    expect(orders.createWithOutbox).not.toHaveBeenCalled();
    expect(inventory.confirm).toHaveBeenCalledWith('reservation-001');
    expect(orders.markReadyForPublishing).toHaveBeenCalledWith(1001);
  });

  it('releases reserved inventory when order persistence fails', async () => {
    orders.findByClientRequestId.mockResolvedValue(null);
    customers.getMembership.mockResolvedValue({
      uid: 10,
      score: 0,
      discountPercent: '0.00',
    });
    inventory.reserve.mockResolvedValue({
      reservationId: 'reservation-failed',
      products: [{ pid: 1, pname: 'Laptop', qty: 1, unitPrice: '1500.00' }],
    });
    orders.createWithOutbox.mockRejectedValue(new Error('Database failed'));
    inventory.release.mockResolvedValue(undefined);

    await expect(
      createOrder.execute({
        uid: 10,
        clientRequestId: 'checkout-failed',
        items: [{ pid: 1, qty: 1 }],
      }),
    ).rejects.toThrow('Database failed');

    expect(inventory.release).toHaveBeenCalledWith(
      'reservation-failed',
      'Order persistence failed',
    );
  });

  it('reports a retryable state when confirmation fails after persistence', async () => {
    orders.findByClientRequestId.mockResolvedValue(null);
    customers.getMembership.mockResolvedValue({
      uid: 10,
      score: 0,
      discountPercent: '0.00',
    });
    inventory.reserve.mockResolvedValue({
      reservationId: 'reservation-001',
      products: [{ pid: 1, pname: 'Laptop', qty: 1, unitPrice: '1500.00' }],
    });
    orders.createWithOutbox.mockResolvedValue(persistedOrder());
    inventory.confirm.mockRejectedValue(new Error('Product unavailable'));

    await expect(
      createOrder.execute({
        uid: 10,
        clientRequestId: 'checkout-001',
        items: [{ pid: 1, qty: 1 }],
      }),
    ).rejects.toBeInstanceOf(InventoryConfirmationPendingError);

    expect(inventory.release).not.toHaveBeenCalled();
  });

  it('allows customers to read only their own order', async () => {
    orders.findByOid.mockResolvedValue(persistedOrder(10));

    await expect(
      getOrder.execute({
        oid: 1001,
        requesterUid: 11,
        requesterRole: 'CUSTOMER',
      }),
    ).rejects.toBeInstanceOf(OrderAccessDeniedError);

    await expect(
      getOrder.execute({
        oid: 1001,
        requesterUid: 10,
        requesterRole: 'CUSTOMER',
      }),
    ).resolves.toMatchObject({ oid: 1001, uid: 10 });
  });

  it('scopes customer lists and permits admin filtering', async () => {
    orders.list.mockResolvedValue({
      orders: [persistedOrder()],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    await listOrders.execute({
      requesterUid: 10,
      requesterRole: 'CUSTOMER',
    });
    expect(orders.list).toHaveBeenLastCalledWith({
      uid: 10,
      page: 1,
      pageSize: 20,
    });

    await listOrders.execute({
      requesterUid: 1,
      requesterRole: 'ADMIN',
      customerUid: 10,
    });
    expect(orders.list).toHaveBeenLastCalledWith({
      uid: 10,
      page: 1,
      pageSize: 20,
    });
  });
});
