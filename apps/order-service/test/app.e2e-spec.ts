import 'dotenv/config';
import { join } from 'node:path';
import { Controller, INestMicroservice } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { Test } from '@nestjs/testing';
import {
  ClientGrpc,
  ClientProxy,
  ClientProxyFactory,
  GrpcMethod,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Consumer, Kafka, KafkaMessage } from 'kafkajs';
import { firstValueFrom, Observable } from 'rxjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

@Controller()
class CustomerStubController {
  membershipCalls = 0;

  @GrpcMethod('CustomerService', 'GetCustomerMembership')
  getCustomerMembership(request: { uid: number }) {
    this.membershipCalls += 1;

    return {
      uid: request.uid,
      score: 1_500,
      membership: {
        mid: 2,
        name: 'Gold',
        minScore: 1_000,
        discountPercent: '10.00',
      },
    };
  }
}

@Controller()
class ProductStubController {
  reserveCalls = 0;
  confirmedReservations: string[] = [];

  @GrpcMethod('ProductService', 'ReserveInventory')
  reserveInventory() {
    this.reserveCalls += 1;

    return {
      reservationId: 'reservation-e2e-57-59',
      status: 'INVENTORY_RESERVATION_STATUS_RESERVED',
      products: [
        {
          pid: 101,
          pname: 'E2E Keyboard',
          qty: 2,
          unitPrice: '100.00',
        },
        {
          pid: 102,
          pname: 'E2E Mouse',
          qty: 1,
          unitPrice: '50.00',
        },
      ],
    };
  }

  @GrpcMethod('ProductService', 'ConfirmInventoryReservation')
  confirmInventoryReservation(request: { reservationId: string }) {
    this.confirmedReservations.push(request.reservationId);

    return {
      reservationId: request.reservationId,
      status: 'INVENTORY_RESERVATION_STATUS_CONFIRMED',
    };
  }

  @GrpcMethod('ProductService', 'ReleaseInventoryReservation')
  releaseInventoryReservation(request: { reservationId: string }) {
    return {
      reservationId: request.reservationId,
      status: 'INVENTORY_RESERVATION_STATUS_RELEASED',
    };
  }
}

interface Order {
  oid: number;
  uid: number;
  items: Array<{
    pid: number;
    pname: string;
    qty: number;
    unitPrice: string;
    lineTotal: string;
  }>;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  totalAmount: string;
  status: string;
}

interface OrderResponse {
  order: Order;
}

interface OrderServiceClient {
  createOrder(request: {
    uid: number;
    items: Array<{ pid: number; qty: number }>;
    clientRequestId: string;
  }): Observable<OrderResponse>;
  getOrder(request: {
    oid: number;
    requesterUid: number;
    requesterRole: string;
  }): Observable<OrderResponse>;
  listOrders(request: {
    requesterUid: number;
    requesterRole: string;
    page: number;
    pageSize: number;
    customerUid?: number;
  }): Observable<{
    orders: Order[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}

describe('OrderService gRPC and Kafka (e2e)', () => {
  const grpcAddress = '127.0.0.1:55054';
  const clientRequestId = 'order-e2e-57-59';
  const topic = 'order-created-e2e';
  const protoPath = join(
    __dirname,
    '../../../packages/contracts/proto/order.proto',
  );
  const customerProtoPath = join(
    __dirname,
    '../../../packages/contracts/proto/customer.proto',
  );
  const productProtoPath = join(
    __dirname,
    '../../../packages/contracts/proto/product.proto',
  );

  let app: INestMicroservice;
  let customerStubApp: INestMicroservice;
  let productStubApp: INestMicroservice;
  let customerStub: CustomerStubController;
  let productStub: ProductStubController;
  let client: ClientProxy;
  let service: OrderServiceClient;
  let prisma: PrismaService;
  let consumer: Consumer;
  let kafka: Kafka;
  let receivedEvent: Record<string, unknown> | undefined;
  let resolveEvent: ((event: Record<string, unknown>) => void) | undefined;
  let eventPromise: Promise<Record<string, unknown>>;
  let originalTopic: string | undefined;
  let originalPollInterval: string | undefined;
  let originalCustomerGrpcUrl: string | undefined;
  let originalProductGrpcUrl: string | undefined;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for Order Service E2E tests');
    }

    originalTopic = process.env.ORDER_CREATED_TOPIC;
    originalPollInterval = process.env.OUTBOX_POLL_INTERVAL_MS;
    originalCustomerGrpcUrl = process.env.CUSTOMER_GRPC_URL;
    originalProductGrpcUrl = process.env.PRODUCT_GRPC_URL;
    process.env.ORDER_CREATED_TOPIC = topic;
    process.env.OUTBOX_POLL_INTERVAL_MS = '100';
    process.env.CUSTOMER_GRPC_URL = '127.0.0.1:55052';
    process.env.PRODUCT_GRPC_URL = '127.0.0.1:55053';

    kafka = new Kafka({
      clientId: 'order-service-e2e',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    if (topics.includes(topic)) {
      await admin.deleteTopics({ topics: [topic] });
    }
    await admin.createTopics({
      topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
      waitForLeaders: true,
    });
    await admin.disconnect();

    const customerStubModule = await Test.createTestingModule({
      controllers: [CustomerStubController],
    }).compile();
    customerStubApp = customerStubModule.createNestMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.customer.v1',
        protoPath: customerProtoPath,
        url: process.env.CUSTOMER_GRPC_URL,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    });
    await customerStubApp.listen();
    customerStub = customerStubApp.get(CustomerStubController);

    const productStubModule = await Test.createTestingModule({
      controllers: [ProductStubController],
    }).compile();
    productStubApp = productStubModule.createNestMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.product.v1',
        protoPath: productProtoPath,
        url: process.env.PRODUCT_GRPC_URL,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    });
    await productStubApp.listen();
    productStub = productStubApp.get(ProductStubController);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.order.v1',
        protoPath,
        url: grpcAddress,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    });
    await app.listen();

    prisma = app.get(PrismaService);
    await cleanTestData();

    client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.order.v1',
        protoPath,
        url: grpcAddress,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    });
    service = (client as unknown as ClientGrpc).getService<OrderServiceClient>(
      'OrderService',
    );

    eventPromise = new Promise((resolve) => {
      resolveEvent = resolve;
    });
    consumer = kafka.consumer({
      groupId: `order-service-e2e-${Date.now()}`,
    });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ message }: { message: KafkaMessage }) => {
        if (!message.value) {
          return;
        }

        const event = JSON.parse(message.value.toString()) as Record<
          string,
          unknown
        >;
        if (event.correlation_id === clientRequestId) {
          receivedEvent = event;
          resolveEvent?.(event);
        }
      },
    });
  }, 30_000);

  afterAll(async () => {
    await cleanTestData();
    await consumer?.disconnect();
    client?.close();
    await app?.close();
    await productStubApp?.close();
    await customerStubApp?.close();

    const admin = kafka?.admin();
    if (admin) {
      await admin.connect();
      const topics = await admin.listTopics();
      if (topics.includes(topic)) {
        await admin.deleteTopics({ topics: [topic] });
      }
      await admin.disconnect();
    }

    restoreEnvironment('ORDER_CREATED_TOPIC', originalTopic);
    restoreEnvironment('OUTBOX_POLL_INTERVAL_MS', originalPollInterval);
    restoreEnvironment('CUSTOMER_GRPC_URL', originalCustomerGrpcUrl);
    restoreEnvironment('PRODUCT_GRPC_URL', originalProductGrpcUrl);
  }, 30_000);

  it('stores a discounted order and publishes OrderCreated to Kafka', async () => {
    const response = await firstValueFrom(
      service.createOrder({
        uid: 7001,
        clientRequestId,
        items: [
          { pid: 101, qty: 2 },
          { pid: 102, qty: 1 },
        ],
      }),
    );

    expect(response.order).toMatchObject({
      uid: 7001,
      subtotal: '250.00',
      discountPercent: '10.00',
      discountAmount: '25.00',
      totalAmount: '225.00',
      status: 'ORDER_STATUS_CREATED',
    });
    expect(response.order.items).toHaveLength(2);
    expect(productStub.confirmedReservations).toContain(
      'reservation-e2e-57-59',
    );

    const saved = await prisma.order.findUnique({
      where: { clientRequestId },
      include: { details: true },
    });
    expect(saved?.details).toHaveLength(2);
    expect(saved?.totalAmount.toFixed(2)).toBe('225.00');

    const event = await waitForOrderCreatedEvent();
    expect(event).toMatchObject({
      event_type: 'order.created',
      event_version: 1,
      correlation_id: clientRequestId,
      data: {
        oid: response.order.oid,
        uid: 7001,
        subtotal: '250.00',
        discount_amount: '25.00',
        total_amount: '225.00',
      },
    });

    const outbox = await prisma.outboxEvent.findFirst({
      where: { aggregateId: response.order.oid },
    });
    expect(outbox).toMatchObject({
      status: 'PUBLISHED',
      attempts: 0,
    });
    expect(outbox?.publishedAt).toBeInstanceOf(Date);
  });

  it('returns the original order for a repeated idempotency key', async () => {
    const beforeOrderCount = await prisma.order.count({
      where: { clientRequestId },
    });

    const repeated = await firstValueFrom(
      service.createOrder({
        uid: 7001,
        clientRequestId,
        items: [{ pid: 101, qty: 2 }],
      }),
    );

    expect(repeated.order.totalAmount).toBe('225.00');
    await expect(
      prisma.order.count({ where: { clientRequestId } }),
    ).resolves.toBe(beforeOrderCount);
    expect(customerStub.membershipCalls).toBe(1);
    expect(productStub.reserveCalls).toBe(1);
  });

  it('enforces customer ownership while allowing an admin to read', async () => {
    const saved = await prisma.order.findUniqueOrThrow({
      where: { clientRequestId },
    });

    await expect(
      firstValueFrom(
        service.getOrder({
          oid: saved.oid,
          requesterUid: 7002,
          requesterRole: 'CUSTOMER',
        }),
      ),
    ).rejects.toMatchObject({ code: status.PERMISSION_DENIED });

    const adminResult = await firstValueFrom(
      service.getOrder({
        oid: saved.oid,
        requesterUid: 1,
        requesterRole: 'ADMIN',
      }),
    );
    expect(adminResult.order.oid).toBe(saved.oid);

    const customerList = await firstValueFrom(
      service.listOrders({
        requesterUid: 7001,
        requesterRole: 'CUSTOMER',
        page: 1,
        pageSize: 20,
        customerUid: 7002,
      }),
    );
    expect(customerList.orders).toHaveLength(1);
    expect(customerList.orders[0].uid).toBe(7001);
  });

  async function waitForOrderCreatedEvent(): Promise<Record<string, unknown>> {
    if (receivedEvent) {
      return receivedEvent;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for OrderCreated event'));
      }, 10_000);

      void eventPromise.then(
        (event) => {
          clearTimeout(timeout);
          resolve(event);
        },
        (error: unknown) => {
          clearTimeout(timeout);
          reject(error);
        },
      );
    });
  }

  async function cleanTestData(): Promise<void> {
    if (!prisma) {
      return;
    }

    const orders = await prisma.order.findMany({
      where: { clientRequestId },
      select: { oid: true },
    });
    const orderIds = orders.map((order) => order.oid);

    if (orderIds.length > 0) {
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: orderIds } },
      });
      await prisma.order.deleteMany({
        where: { oid: { in: orderIds } },
      });
    }
  }

  function restoreEnvironment(key: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});
