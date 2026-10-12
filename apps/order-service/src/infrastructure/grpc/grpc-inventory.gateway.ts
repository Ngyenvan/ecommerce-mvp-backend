import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  InventoryGateway,
  InventoryRequestItem,
  InventoryReservation,
} from '../../application/order/ports/inventory.gateway';
import { PRODUCT_GRPC_CLIENT } from './grpc-client.tokens';
import { toDownstreamServiceError } from './grpc-downstream.errors';

interface ReserveInventoryResponse {
  reservationId: string;
  products: Array<{
    pid: number;
    pname: string;
    unitPrice: string;
    qty: number;
  }>;
}

interface ProductServiceClient {
  reserveInventory(request: {
    items: InventoryRequestItem[];
  }): Observable<ReserveInventoryResponse>;
  confirmInventoryReservation(request: {
    reservationId: string;
  }): Observable<unknown>;
  releaseInventoryReservation(request: {
    reservationId: string;
    reason: string;
  }): Observable<unknown>;
}

@Injectable()
export class GrpcInventoryGateway implements InventoryGateway, OnModuleInit {
  private productService!: ProductServiceClient;

  constructor(
    @Inject(PRODUCT_GRPC_CLIENT) private readonly client: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.productService =
      this.client.getService<ProductServiceClient>('ProductService');
  }

  async reserve(items: InventoryRequestItem[]): Promise<InventoryReservation> {
    try {
      return await firstValueFrom(
        this.productService.reserveInventory({ items }),
      );
    } catch (error: unknown) {
      throw toDownstreamServiceError('Product Service', error);
    }
  }

  async confirm(reservationId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.productService.confirmInventoryReservation({ reservationId }),
      );
    } catch (error: unknown) {
      throw toDownstreamServiceError('Product Service', error);
    }
  }

  async release(reservationId: string, reason: string): Promise<void> {
    try {
      await firstValueFrom(
        this.productService.releaseInventoryReservation({
          reservationId,
          reason,
        }),
      );
    } catch (error: unknown) {
      throw toDownstreamServiceError('Product Service', error);
    }
  }
}
