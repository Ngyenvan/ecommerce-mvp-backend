import { Controller } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import {
  InvalidShipmentRequestError,
  ShipmentNotFoundError,
} from '../../application/shipment/errors/shipment-application.errors';
import { GetShipmentByOrderIdUseCase } from '../../application/shipment/use-cases/get-shipment-by-order-id.use-case';
import { GetShipmentUseCase } from '../../application/shipment/use-cases/get-shipment.use-case';
import { ListShipmentsUseCase } from '../../application/shipment/use-cases/list-shipments.use-case';
import { UpdateShipmentStatusUseCase } from '../../application/shipment/use-cases/update-shipment-status.use-case';
import { ShipmentStatus } from '../../domain/shipment/shipment.entity';
import {
  InvalidShipmentError,
  InvalidShipmentTransitionError,
} from '../../domain/shipment/shipment.errors';

interface GetShipmentRequest {
  shipid: number;
}

interface GetShipmentByOrderIdRequest {
  oid: number;
}

interface ListShipmentsRequest {
  page: number;
  pageSize: number;
  status?: ShipmentStatus | 'SHIPMENT_STATUS_UNSPECIFIED';
  oid?: number;
}

interface UpdateShipmentStatusRequest {
  shipid: number;
  status: ShipmentStatus;
  note: string;
  updatedByUid: number;
}

@Controller()
export class ShipmentGrpcController {
  constructor(
    private readonly getShipmentUseCase: GetShipmentUseCase,
    private readonly getShipmentByOrderIdUseCase: GetShipmentByOrderIdUseCase,
    private readonly listShipmentsUseCase: ListShipmentsUseCase,
    private readonly updateShipmentStatusUseCase: UpdateShipmentStatusUseCase,
  ) {}

  @GrpcMethod('ShipmentService', 'GetShipment')
  async getShipment(request: GetShipmentRequest) {
    try {
      const shipment = await this.getShipmentUseCase.execute(request.shipid);

      return { shipment };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ShipmentService', 'GetShipmentByOrderId')
  async getShipmentByOrderId(request: GetShipmentByOrderIdRequest) {
    try {
      const shipment = await this.getShipmentByOrderIdUseCase.execute(
        request.oid,
      );

      return { shipment };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ShipmentService', 'ListShipments')
  async listShipments(request: ListShipmentsRequest) {
    try {
      const requestedStatus =
        request.status === undefined ||
        request.status === 'SHIPMENT_STATUS_UNSPECIFIED'
          ? undefined
          : request.status;

      return await this.listShipmentsUseCase.execute({
        page: request.page,
        pageSize: request.pageSize,
        status: requestedStatus,
        oid: request.oid,
      });
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  @GrpcMethod('ShipmentService', 'UpdateShipmentStatus')
  async updateShipmentStatus(request: UpdateShipmentStatusRequest) {
    try {
      const shipment = await this.updateShipmentStatusUseCase.execute({
        shipid: request.shipid,
        status: request.status,
        note: request.note,
        updatedByUid: request.updatedByUid,
      });

      return { shipment };
    } catch (error: unknown) {
      this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (error instanceof RpcException) {
      throw error;
    }

    if (
      error instanceof InvalidShipmentRequestError ||
      error instanceof InvalidShipmentError
    ) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error.message,
      });
    }

    if (error instanceof ShipmentNotFoundError) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error.message,
      });
    }

    if (error instanceof InvalidShipmentTransitionError) {
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
