import { Controller } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import {
  InvalidInventoryReservationRequestError,
  InventoryReservationNotFoundError,
} from '../../application/inventory/errors/inventory.errors';
import { ConfirmInventoryReservationUseCase } from '../../application/inventory/use-cases/confirm-inventory-reservation.use-case';
import { ReleaseInventoryReservationUseCase } from '../../application/inventory/use-cases/release-inventory-reservation.use-case';
import { ReserveInventoryUseCase } from '../../application/inventory/use-cases/reserve-inventory.use-case';
import {
  InvalidProductListQueryError,
  InvalidProductUpdateError,
  ProductNotFoundError,
} from '../../application/product/errors/product.errors';
import { CreateProductUseCase } from '../../application/product/use-cases/create-product.use-case';
import { DeleteProductUseCase } from '../../application/product/use-cases/delete-product.use-case';
import { GetProductUseCase } from '../../application/product/use-cases/get-product.use-case';
import { ListProductsUseCase } from '../../application/product/use-cases/list-products.use-case';
import { UpdateProductUseCase } from '../../application/product/use-cases/update-product.use-case';
import {
  InsufficientInventoryError,
  InvalidInventoryReservationTransitionError,
} from '../../domain/inventory/inventory-reservation.errors';

interface ListProductsRequest {
  page: number;
  pageSize: number;
  search: string;
}

interface ProductIdRequest {
  pid: number;
}

interface CreateProductRequest {
  pname: string;
  price: string;
  quantity: number;
}

interface UpdateProductRequest extends ProductIdRequest {
  pname?: string;
  price?: string;
  quantity?: number;
  isActive?: boolean;
}

interface InventoryItemRequest {
  pid: number;
  qty: number;
}

interface ReserveInventoryRequest {
  items: InventoryItemRequest[];
}

interface InventoryReservationRequest {
  reservationId: string;
}

interface ReleaseInventoryReservationRequest extends InventoryReservationRequest {
  reason: string;
}

@Controller()
export class ProductGrpcController {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly reserveInventoryUseCase: ReserveInventoryUseCase,
    private readonly confirmInventoryReservationUseCase: ConfirmInventoryReservationUseCase,
    private readonly releaseInventoryReservationUseCase: ReleaseInventoryReservationUseCase,
  ) {}

  @GrpcMethod('ProductService', 'ListProducts')
  async list(request: ListProductsRequest) {
    try {
      return await this.listProductsUseCase.execute(request);
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ProductService', 'GetProduct')
  async findOne(request: ProductIdRequest) {
    try {
      const product = await this.getProductUseCase.execute(request.pid);

      return { product };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ProductService', 'CreateProduct')
  async create(request: CreateProductRequest) {
    try {
      const product = await this.createProductUseCase.execute(request);

      return { product };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ProductService', 'UpdateProduct')
  async update(request: UpdateProductRequest) {
    try {
      const product = await this.updateProductUseCase.execute(request);

      return { product };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ProductService', 'DeleteProduct')
  async remove(request: ProductIdRequest) {
    try {
      return await this.deleteProductUseCase.execute(request.pid);
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ProductService', 'ReserveInventory')
  async reserveInventory(request: ReserveInventoryRequest) {
    try {
      return await this.reserveInventoryUseCase.execute(request);
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ProductService', 'ConfirmInventoryReservation')
  async confirmInventory(request: InventoryReservationRequest) {
    try {
      return await this.confirmInventoryReservationUseCase.execute(
        request.reservationId,
      );
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ProductService', 'ReleaseInventoryReservation')
  async releaseInventory(request: ReleaseInventoryReservationRequest) {
    try {
      return await this.releaseInventoryReservationUseCase.execute(request);
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (error instanceof RpcException) {
      throw error;
    }

    if (
      error instanceof InvalidProductListQueryError ||
      error instanceof InvalidProductUpdateError ||
      error instanceof InvalidInventoryReservationRequestError
    ) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error.message,
      });
    }

    if (
      error instanceof ProductNotFoundError ||
      error instanceof InventoryReservationNotFoundError
    ) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error.message,
      });
    }

    if (
      error instanceof InsufficientInventoryError ||
      error instanceof InvalidInventoryReservationTransitionError
    ) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: error.message,
      });
    }

    throw new RpcException({
      code: status.INTERNAL,
      message: 'Internal server error',
    });
  }
}
