import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { InventoryReservationStatus } from '../../domain/inventory/inventory-reservation.entity';
import { InsufficientInventoryError } from '../../domain/inventory/inventory-reservation.errors';
import { ConfirmInventoryReservationUseCase } from '../../application/inventory/use-cases/confirm-inventory-reservation.use-case';
import { ReleaseInventoryReservationUseCase } from '../../application/inventory/use-cases/release-inventory-reservation.use-case';
import { ReserveInventoryUseCase } from '../../application/inventory/use-cases/reserve-inventory.use-case';
import { ProductNotFoundError } from '../../application/product/errors/product.errors';
import { CreateProductUseCase } from '../../application/product/use-cases/create-product.use-case';
import { DeleteProductUseCase } from '../../application/product/use-cases/delete-product.use-case';
import { GetProductUseCase } from '../../application/product/use-cases/get-product.use-case';
import { ListProductsUseCase } from '../../application/product/use-cases/list-products.use-case';
import { UpdateProductUseCase } from '../../application/product/use-cases/update-product.use-case';
import { ProductGrpcController } from './product-grpc.controller';

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

describe('ProductGrpcController', () => {
  const listProducts = { execute: jest.fn() };
  const getProduct = { execute: jest.fn() };
  const createProduct = { execute: jest.fn() };
  const updateProduct = { execute: jest.fn() };
  const deleteProduct = { execute: jest.fn() };
  const reserveInventory = { execute: jest.fn() };
  const confirmInventoryReservation = { execute: jest.fn() };
  const releaseInventoryReservation = { execute: jest.fn() };

  let controller: ProductGrpcController;

  const product = {
    pid: 1,
    pname: 'Mechanical Keyboard',
    price: '129.90',
    quantity: 20,
    isActive: true,
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    controller = new ProductGrpcController(
      listProducts as unknown as ListProductsUseCase,
      getProduct as unknown as GetProductUseCase,
      createProduct as unknown as CreateProductUseCase,
      updateProduct as unknown as UpdateProductUseCase,
      deleteProduct as unknown as DeleteProductUseCase,
      reserveInventory as unknown as ReserveInventoryUseCase,
      confirmInventoryReservation as unknown as ConfirmInventoryReservationUseCase,
      releaseInventoryReservation as unknown as ReleaseInventoryReservationUseCase,
    );
  });

  it('returns the product page directly', async () => {
    const result = {
      products: [product],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    listProducts.execute.mockResolvedValue(result);

    await expect(
      controller.list({ page: 1, pageSize: 20, search: '' }),
    ).resolves.toEqual(result);
  });

  it('wraps a product in ProductResponse', async () => {
    getProduct.execute.mockResolvedValue(product);

    await expect(controller.findOne({ pid: 1 })).resolves.toEqual({ product });
  });

  it('forwards product creation and wraps its response', async () => {
    createProduct.execute.mockResolvedValue(product);

    await expect(
      controller.create({
        pname: 'Mechanical Keyboard',
        price: '129.90',
        quantity: 20,
      }),
    ).resolves.toEqual({ product });
  });

  it('forwards optional update fields without changing them', async () => {
    updateProduct.execute.mockResolvedValue(product);

    await controller.update({ pid: 1, quantity: 25, isActive: true });

    expect(updateProduct.execute).toHaveBeenCalledWith({
      pid: 1,
      quantity: 25,
      isActive: true,
    });
  });

  it('returns the complete inventory reservation snapshot', async () => {
    const result = {
      reservationId: 'reservation-1',
      status: InventoryReservationStatus.RESERVED,
      products: [
        {
          pid: 1,
          pname: 'Mechanical Keyboard',
          unitPrice: '129.90',
          qty: 2,
        },
      ],
    };

    reserveInventory.execute.mockResolvedValue(result);

    await expect(
      controller.reserveInventory({ items: [{ pid: 1, qty: 2 }] }),
    ).resolves.toEqual(result);
  });

  it('forwards a release reason to the application layer', async () => {
    const result = {
      reservationId: 'reservation-1',
      status: InventoryReservationStatus.RELEASED,
    };

    releaseInventoryReservation.execute.mockResolvedValue(result);

    await expect(
      controller.releaseInventory({
        reservationId: 'reservation-1',
        reason: 'Order cancelled',
      }),
    ).resolves.toEqual(result);
  });

  it('maps a missing product to NOT_FOUND', async () => {
    getProduct.execute.mockRejectedValue(new ProductNotFoundError(99));

    await expectRpcError(controller.findOne({ pid: 99 }), status.NOT_FOUND);
  });

  it('maps insufficient inventory to FAILED_PRECONDITION', async () => {
    reserveInventory.execute.mockRejectedValue(
      new InsufficientInventoryError(1),
    );

    await expectRpcError(
      controller.reserveInventory({ items: [{ pid: 1, qty: 1000 }] }),
      status.FAILED_PRECONDITION,
    );
  });
});
