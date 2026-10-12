import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import {
  DownstreamServiceError,
  OrderAccessDeniedError,
  OrderNotFoundError,
} from '../../application/order/errors/order-application.errors';
import { CreateOrderUseCase } from '../../application/order/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/order/use-cases/get-order.use-case';
import { ListOrdersUseCase } from '../../application/order/use-cases/list-orders.use-case';
import { OrderGrpcController } from './order-grpc.controller';

async function expectRpcError(
  promise: Promise<unknown>,
  expectedCode: number,
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected an RPC error');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toMatchObject({
      code: expectedCode,
    });
  }
}

describe('OrderGrpcController', () => {
  const createOrder = { execute: jest.fn() };
  const listOrders = { execute: jest.fn() };
  const getOrder = { execute: jest.fn() };

  let controller: OrderGrpcController;

  const order = {
    oid: 1001,
    uid: 10,
    items: [],
    subtotal: '100.00',
    discountPercent: '10.00',
    discountAmount: '10.00',
    totalAmount: '90.00',
    status: 'ORDER_STATUS_CREATED',
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new OrderGrpcController(
      createOrder as unknown as CreateOrderUseCase,
      listOrders as unknown as ListOrdersUseCase,
      getOrder as unknown as GetOrderUseCase,
    );
  });

  it('wraps a created order in OrderResponse', async () => {
    createOrder.execute.mockResolvedValue(order);

    await expect(
      controller.create({
        uid: 10,
        clientRequestId: 'checkout-001',
        items: [{ pid: 1, qty: 1 }],
      }),
    ).resolves.toEqual({ order });
  });

  it('returns an order list directly', async () => {
    const result = { orders: [order], total: 1, page: 1, pageSize: 20 };
    listOrders.execute.mockResolvedValue(result);

    await expect(
      controller.list({
        requesterUid: 10,
        requesterRole: 'CUSTOMER',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual(result);
  });

  it('maps a missing order to NOT_FOUND', async () => {
    getOrder.execute.mockRejectedValue(new OrderNotFoundError(999));

    await expectRpcError(
      controller.findOne({
        oid: 999,
        requesterUid: 10,
        requesterRole: 'CUSTOMER',
      }),
      status.NOT_FOUND,
    );
  });

  it('maps unauthorized order access to PERMISSION_DENIED', async () => {
    getOrder.execute.mockRejectedValue(new OrderAccessDeniedError());

    await expectRpcError(
      controller.findOne({
        oid: 1001,
        requesterUid: 11,
        requesterRole: 'CUSTOMER',
      }),
      status.PERMISSION_DENIED,
    );
  });

  it('preserves relevant downstream business errors', async () => {
    createOrder.execute.mockRejectedValue(
      new DownstreamServiceError(
        'Product Service',
        status.FAILED_PRECONDITION,
        'Insufficient inventory',
      ),
    );

    await expectRpcError(
      controller.create({
        uid: 10,
        clientRequestId: 'checkout-002',
        items: [{ pid: 1, qty: 1000 }],
      }),
      status.FAILED_PRECONDITION,
    );
  });
});
