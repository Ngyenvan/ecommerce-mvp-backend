import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import { RedisService } from '../cache/redis.service';
import type { AuthRole } from '../auth/auth.types';
import {
  CUSTOMER_GRPC_CLIENT,
  ORDER_GRPC_CLIENT,
  PRODUCT_GRPC_CLIENT,
  SHIPMENT_GRPC_CLIENT,
} from './grpc-client.constants';
import { throwMappedGrpcError } from './grpc-error.mapper';
import type {
  CustomerGrpcService,
  OrderGrpcService,
  ProductGrpcService,
  ProductResponse,
  ShipmentGrpcService,
} from './backend-grpc.interfaces';

@Injectable()
export class BackendProxyService implements OnModuleInit {
  private customerGrpc!: CustomerGrpcService;
  private productGrpc!: ProductGrpcService;
  private orderGrpc!: OrderGrpcService;
  private shipmentGrpc!: ShipmentGrpcService;
  private readonly cacheTtlSeconds: number;

  constructor(
    @Inject(CUSTOMER_GRPC_CLIENT)
    private readonly customerClient: ClientGrpc,
    @Inject(PRODUCT_GRPC_CLIENT)
    private readonly productClient: ClientGrpc,
    @Inject(ORDER_GRPC_CLIENT)
    private readonly orderClient: ClientGrpc,
    @Inject(SHIPMENT_GRPC_CLIENT)
    private readonly shipmentClient: ClientGrpc,
    private readonly redis: RedisService,
    configService: ConfigService,
  ) {
    const configuredTtl = Number(
      configService.get<string>('CACHE_TTL_SECONDS') ?? '60',
    );

    this.cacheTtlSeconds =
      Number.isInteger(configuredTtl) && configuredTtl > 0 ? configuredTtl : 60;
  }

  onModuleInit(): void {
    this.customerGrpc =
      this.customerClient.getService<CustomerGrpcService>('CustomerService');

    this.productGrpc =
      this.productClient.getService<ProductGrpcService>('ProductService');

    this.orderGrpc =
      this.orderClient.getService<OrderGrpcService>('OrderService');

    this.shipmentGrpc =
      this.shipmentClient.getService<ShipmentGrpcService>('ShipmentService');
  }

  createCustomer(
    uid: number,
    body: {
      fullName: string;
      email: string;
      phone: string;
    },
  ) {
    return this.invoke(this.customerGrpc.createCustomer({ uid, ...body }));
  }

  getCustomer(uid: number) {
    return this.invoke(this.customerGrpc.getCustomer({ uid }));
  }

  updateCustomer(
    uid: number,
    body: {
      fullName?: string;
      email?: string;
      phone?: string;
    },
  ) {
    return this.invoke(this.customerGrpc.updateCustomer({ uid, ...body }));
  }

  getCustomerMembership(uid: number) {
    return this.invoke(this.customerGrpc.getCustomerMembership({ uid }));
  }

  adjustCustomerScore(
    uid: number,
    body: {
      scoreDelta: number;
      reason: string;
      referenceId: string;
    },
  ) {
    return this.invoke(
      this.customerGrpc.adjustCustomerScore({
        uid,
        ...body,
      }),
    );
  }

  listMemberships() {
    return this.invoke(this.customerGrpc.listMembershipTiers({}));
  }

  createMembership(body: {
    name: string;
    minScore: number;
    discountPercent: string;
  }) {
    return this.invoke(this.customerGrpc.createMembershipTier(body));
  }

  updateMembership(
    mid: number,
    body: {
      name?: string;
      minScore?: number;
      discountPercent?: string;
    },
  ) {
    return this.invoke(
      this.customerGrpc.updateMembershipTier({
        mid,
        ...body,
      }),
    );
  }

  listProducts(query: { page: number; pageSize: number; search: string }) {
    return this.invoke(this.productGrpc.listProducts(query));
  }

  async getProduct(pid: number): Promise<ProductResponse> {
    const cacheKey = `product:${pid}`;
    const cached = await this.redis.getJson<ProductResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.invoke(this.productGrpc.getProduct({ pid }));

    await this.redis.setJson(cacheKey, response, this.cacheTtlSeconds);

    return response;
  }

  async createProduct(body: {
    pname: string;
    price: string;
    quantity: number;
  }): Promise<ProductResponse> {
    return this.invoke(this.productGrpc.createProduct(body));
  }

  async updateProduct(
    pid: number,
    body: {
      pname?: string;
      price?: string;
      quantity?: number;
      isActive?: boolean;
    },
  ): Promise<ProductResponse> {
    const response = await this.invoke(
      this.productGrpc.updateProduct({
        pid,
        ...body,
      }),
    );

    await this.redis.delete(`product:${pid}`);

    return response;
  }

  async deleteProduct(pid: number): Promise<unknown> {
    const response = await this.invoke(this.productGrpc.deleteProduct({ pid }));

    await this.redis.delete(`product:${pid}`);

    return response;
  }

  createOrder(
    uid: number,
    body: {
      items: Array<{ pid: number; qty: number }>;
      clientRequestId: string;
    },
  ) {
    return this.invoke(
      this.orderGrpc.createOrder({
        uid,
        ...body,
      }),
    );
  }

  listOrders(
    requesterUid: number,
    requesterRole: AuthRole,
    query: {
      page: number;
      pageSize: number;
      customerUid?: number;
    },
  ) {
    return this.invoke(
      this.orderGrpc.listOrders({
        requesterUid,
        requesterRole,
        ...query,
      }),
    );
  }

  getOrder(oid: number, requesterUid: number, requesterRole: AuthRole) {
    return this.invoke(
      this.orderGrpc.getOrder({
        oid,
        requesterUid,
        requesterRole,
      }),
    );
  }

  getShipment(shipid: number) {
    return this.invoke(this.shipmentGrpc.getShipment({ shipid }));
  }

  getShipmentByOrderId(oid: number) {
    return this.invoke(this.shipmentGrpc.getShipmentByOrderId({ oid }));
  }

  listShipments(query: {
    page: number;
    pageSize: number;
    status?: string;
    oid?: number;
  }) {
    return this.invoke(this.shipmentGrpc.listShipments(query));
  }

  updateShipmentStatus(
    shipid: number,
    updatedByUid: number,
    body: {
      status: string;
      note: string;
    },
  ) {
    return this.invoke(
      this.shipmentGrpc.updateShipmentStatus({
        shipid,
        updatedByUid,
        ...body,
      }),
    );
  }

  private async invoke<T>(operation: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(operation);
    } catch (error: unknown) {
      throwMappedGrpcError(error);
    }
  }
}
