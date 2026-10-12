import { Prisma } from '../../generated/prisma/client';
import { OrderAggregate } from '../../domain/order/order.aggregate';
import { PrismaOrderRepository } from './prisma-order.repository';
import { PrismaService } from './prisma.service';

describe('PrismaOrderRepository', () => {
  const createdAt = new Date('2026-10-12T00:00:00.000Z');
  const savedRecord = {
    oid: 1001,
    uid: 10,
    clientRequestId: 'checkout-001',
    inventoryReservationId: 'reservation-001',
    subtotal: new Prisma.Decimal('3025.00'),
    discountPercent: new Prisma.Decimal('10.00'),
    discountAmount: new Prisma.Decimal('302.50'),
    totalAmount: new Prisma.Decimal('2722.50'),
    status: 'CREATED' as const,
    createdAt,
    updatedAt: createdAt,
    details: [
      {
        oid: 1001,
        pid: 1,
        pname: 'Laptop',
        qty: 2,
        unitPrice: new Prisma.Decimal('1500.00'),
        lineTotal: new Prisma.Decimal('3000.00'),
      },
      {
        oid: 1001,
        pid: 2,
        pname: 'Mouse',
        qty: 1,
        unitPrice: new Prisma.Decimal('25.00'),
        lineTotal: new Prisma.Decimal('25.00'),
      },
    ],
  };

  const transactionClient = {
    order: {
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    transactionClient.order.create.mockResolvedValue(savedRecord);
    transactionClient.outboxEvent.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
  });

  it('stores order, details and OrderCreated outbox payload atomically', async () => {
    const repository = new PrismaOrderRepository(
      prisma as unknown as PrismaService,
    );
    const order = OrderAggregate.create({
      uid: 10,
      clientRequestId: 'checkout-001',
      inventoryReservationId: 'reservation-001',
      membershipScore: 1_500,
      discountPercent: '10.00',
      items: [
        { pid: 1, pname: 'Laptop', qty: 2, unitPrice: '1500.00' },
        { pid: 2, pname: 'Mouse', qty: 1, unitPrice: '25.00' },
      ],
    });

    const saved = await repository.createWithOutbox(order);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionClient.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          uid: 10,
          clientRequestId: 'checkout-001',
          inventoryReservationId: 'reservation-001',
          subtotal: '3025.00',
          totalAmount: '2722.50',
        }),
      }),
    );
    expect(transactionClient.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        aggregateId: 1001,
        eventType: 'order.created',
        status: 'AWAITING_CONFIRMATION',
        payload: expect.objectContaining({
          event_id: expect.any(String),
          event_type: 'order.created',
          event_version: 1,
          correlation_id: 'checkout-001',
          data: expect.objectContaining({
            oid: 1001,
            uid: 10,
            total_amount: '2722.50',
          }),
        }),
      }),
    });
    expect(saved.oid).toBe(1001);
  });
});
