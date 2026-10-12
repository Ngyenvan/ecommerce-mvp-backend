import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import {
  InvalidShipmentRequestError,
  ShipmentNotFoundError,
} from '../../application/shipment/errors/shipment-application.errors';
import { GetShipmentByOrderIdUseCase } from '../../application/shipment/use-cases/get-shipment-by-order-id.use-case';
import { GetShipmentUseCase } from '../../application/shipment/use-cases/get-shipment.use-case';
import { ListShipmentsUseCase } from '../../application/shipment/use-cases/list-shipments.use-case';
import { UpdateShipmentStatusUseCase } from '../../application/shipment/use-cases/update-shipment-status.use-case';
import { ShipmentStatus } from '../../domain/shipment/shipment.entity';
import { InvalidShipmentTransitionError } from '../../domain/shipment/shipment.errors';
import { ShipmentGrpcController } from './shipment-grpc.controller';

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

describe('ShipmentGrpcController', () => {
  const getShipment = { execute: jest.fn() };
  const getShipmentByOrderId = { execute: jest.fn() };
  const listShipments = { execute: jest.fn() };
  const updateShipmentStatus = { execute: jest.fn() };

  let controller: ShipmentGrpcController;

  const shipment = {
    shipid: 1001,
    oid: 2001,
    customerUid: 10,
    status: ShipmentStatus.PENDING,
    tracking: [
      {
        status: ShipmentStatus.PENDING,
        note: 'Shipment created from OrderCreated event',
        updatedByUid: 0,
        occurredAt: '2026-10-12T00:00:00.000Z',
      },
    ],
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    controller = new ShipmentGrpcController(
      getShipment as unknown as GetShipmentUseCase,
      getShipmentByOrderId as unknown as GetShipmentByOrderIdUseCase,
      listShipments as unknown as ListShipmentsUseCase,
      updateShipmentStatus as unknown as UpdateShipmentStatusUseCase,
    );
  });

  it('returns a shipment by shipment id', async () => {
    getShipment.execute.mockResolvedValue(shipment);

    await expect(controller.getShipment({ shipid: 1001 })).resolves.toEqual({
      shipment,
    });

    expect(getShipment.execute).toHaveBeenCalledWith(1001);
  });

  it('returns a shipment by order id', async () => {
    getShipmentByOrderId.execute.mockResolvedValue(shipment);

    await expect(
      controller.getShipmentByOrderId({ oid: 2001 }),
    ).resolves.toEqual({
      shipment,
    });

    expect(getShipmentByOrderId.execute).toHaveBeenCalledWith(2001);
  });

  it('returns a shipment list', async () => {
    const result = {
      shipments: [shipment],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    listShipments.execute.mockResolvedValue(result);

    await expect(
      controller.listShipments({
        page: 1,
        pageSize: 20,
        status: ShipmentStatus.PENDING,
      }),
    ).resolves.toEqual(result);

    expect(listShipments.execute).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: ShipmentStatus.PENDING,
      oid: undefined,
    });
  });

  it('converts unspecified status to undefined', async () => {
    listShipments.execute.mockResolvedValue({
      shipments: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    await controller.listShipments({
      page: 1,
      pageSize: 20,
      status: 'SHIPMENT_STATUS_UNSPECIFIED',
    });

    expect(listShipments.execute).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: undefined,
      oid: undefined,
    });
  });

  it('updates shipment status', async () => {
    const updatedShipment = {
      ...shipment,
      status: ShipmentStatus.PROCESSING,
    };

    updateShipmentStatus.execute.mockResolvedValue(updatedShipment);

    await expect(
      controller.updateShipmentStatus({
        shipid: 1001,
        status: ShipmentStatus.PROCESSING,
        note: 'Preparing shipment',
        updatedByUid: 99,
      }),
    ).resolves.toEqual({
      shipment: updatedShipment,
    });
  });

  it('maps a missing shipment to NOT_FOUND', async () => {
    getShipment.execute.mockRejectedValue(new ShipmentNotFoundError(999));

    await expectRpcError(
      controller.getShipment({ shipid: 999 }),
      status.NOT_FOUND,
    );
  });

  it('maps an invalid request to INVALID_ARGUMENT', async () => {
    getShipment.execute.mockRejectedValue(
      new InvalidShipmentRequestError('Shipment id must be a positive integer'),
    );

    await expectRpcError(
      controller.getShipment({ shipid: 0 }),
      status.INVALID_ARGUMENT,
    );
  });

  it('maps an invalid transition to FAILED_PRECONDITION', async () => {
    updateShipmentStatus.execute.mockRejectedValue(
      new InvalidShipmentTransitionError(
        ShipmentStatus.PENDING,
        ShipmentStatus.DELIVERED,
      ),
    );

    await expectRpcError(
      controller.updateShipmentStatus({
        shipid: 1001,
        status: ShipmentStatus.DELIVERED,
        note: 'Delivered',
        updatedByUid: 99,
      }),
      status.FAILED_PRECONDITION,
    );
  });
});
