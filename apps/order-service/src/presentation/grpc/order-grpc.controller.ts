import { Controller } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import {
  DownstreamServiceError,
  InventoryConfirmationPendingError,
  InvalidOrderRequestError,
  OrderAccessDeniedError,
  OrderNotFoundError,
  OrderRequestConflictError,
} from '../../application/order/errors/order-application.errors';
import { CreateOrderUseCase } from '../../application/order/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/order/use-cases/get-order.use-case';
import { ListOrdersUseCase } from '../../application/order/use-cases/list-orders.use-case';
import {
  InvalidDiscountError,
  InvalidMoneyError,
  InvalidOrderError,
} from '../../domain/order/order.errors';

interface CreateOrderRequest {
  uid: number;
  items: Array<{ pid: number; qty: number }>;
  clientRequestId: string;
}

interface ListOrdersRequest {
  requesterUid: number;
  requesterRole: string;
  page: number;
  pageSize: number;
  customerUid?: number;
}

interface GetOrderRequest {
  oid: number;
  requesterUid: number;
  requesterRole: string;
}

@Controller()
export class OrderGrpcController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
  ) {}

  @GrpcMethod('OrderService', 'CreateOrder')
  async create(request: CreateOrderRequest) {
    try {
      const order = await this.createOrderUseCase.execute(request);

      return { order };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('OrderService', 'ListOrders')
  async list(request: ListOrdersRequest) {
    try {
      return await this.listOrdersUseCase.execute(request);
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('OrderService', 'GetOrder')
  async findOne(request: GetOrderRequest) {
    try {
      const order = await this.getOrderUseCase.execute(request);

      return { order };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (error instanceof RpcException) {
      throw error;
    }

    if (
      error instanceof InvalidOrderRequestError ||
      error instanceof InvalidOrderError ||
      error instanceof InvalidMoneyError ||
      error instanceof InvalidDiscountError
    ) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error.message,
      });
    }

    if (error instanceof OrderNotFoundError) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error.message,
      });
    }

    if (error instanceof OrderAccessDeniedError) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: error.message,
      });
    }

    if (error instanceof OrderRequestConflictError) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: error.message,
      });
    }

    if (error instanceof InventoryConfirmationPendingError) {
      throw new RpcException({
        code: status.UNAVAILABLE,
        message: error.message,
      });
    }

    if (error instanceof DownstreamServiceError) {
      const downstreamCode =
        error.grpcCode === status.NOT_FOUND
          ? status.NOT_FOUND
          : error.grpcCode === status.FAILED_PRECONDITION
            ? status.FAILED_PRECONDITION
            : status.UNAVAILABLE;

      throw new RpcException({
        code: downstreamCode,
        message: error.message,
      });
    }

    throw new RpcException({
      code: status.INTERNAL,
      message: 'Internal server error',
    });
  }
}
