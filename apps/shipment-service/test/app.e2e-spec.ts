import 'dotenv/config';
import { join } from 'node:path';
import { status } from '@grpc/grpc-js';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import {
  ClientGrpcProxy,
  ClientProxyFactory,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Kafka, Producer } from 'kafkajs';
import { Model } from 'mongoose';
import { firstValueFrom, Observable } from 'rxjs';
import { AppModule } from '../src/app.module';
import { ShipmentStatus } from '../src/domain/shipment/shipment.entity';
import { ShipmentDocument } from '../src/infrastructure/database/schemas/shipment.schema';

interface TrackingEvent {
  status: string;
  note: string;
  updatedByUid: number;
  occurredAt: string;
}

interface Shipment {
  shipid: number;
  oid: number;
  customerUid: number;
  status: string;
  tracking: TrackingEvent[];
  createdAt: string;
  updatedAt: string;
}

interface ShipmentResponse {
  shipment: Shipment;
}

interface ShipmentServiceClient {
  getShipment(request: { shipid: number }): Observable<ShipmentResponse>;

  getShipmentByOrderId(request: { oid: number }): Observable<ShipmentResponse>;

  listShipments(request: {
    page: number;
    pageSize: number;
    status?: string;
    oid?: number;
  }): Observable<{
    shipments: Shipment[];
    total: number;
    page: number;
    pageSize: number;
  }>;

  updateShipmentStatus(request: {
    shipid: number;
    status: string;
    note: string;
    updatedByUid: number;
  }): Observable<ShipmentResponse>;
}

describe('ShipmentService Kafka, MongoDB and gRPC (e2e)', () => {
  jest.setTimeout(30_000);

  const grpcAddress = '127.0.0.1:55055';
  const topic = 'order-created-shipment-e2e';
  const consumerGroup = `shipment-service-e2e-${Date.now()}`;
  const testOid = 92_001;
  const customerUid = 72_001;

  const protoPath = join(
    __dirname,
    '../../../packages/contracts/proto/shipment.proto',
  );

  let app: INestMicroservice;
  let client: ClientGrpcProxy;
  let service: ShipmentServiceClient;
  let kafka: Kafka;
  let producer: Producer;
  let shipmentModel: Model<ShipmentDocument>;

  let originalTopic: string | undefined;
  let originalConsumerGroup: string | undefined;

  beforeAll(async () => {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required for Shipment Service E2E tests');
    }

    originalTopic = process.env.ORDER_CREATED_TOPIC;
    originalConsumerGroup = process.env.SHIPMENT_CONSUMER_GROUP;

    process.env.ORDER_CREATED_TOPIC = topic;
    process.env.SHIPMENT_CONSUMER_GROUP = consumerGroup;

    kafka = new Kafka({
      clientId: 'shipment-service-e2e',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });

    const admin = kafka.admin();
    await admin.connect();

    try {
      const topics = await admin.listTopics();

      if (topics.includes(topic)) {
        await admin.deleteTopics({ topics: [topic] });
      }

      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
        waitForLeaders: true,
      });
    } finally {
      await admin.disconnect();
    }

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.shipment.v1',
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

    shipmentModel = app.get<Model<ShipmentDocument>>(
      getModelToken(ShipmentDocument.name),
    );

    await shipmentModel.deleteMany({ oid: testOid }).exec();

    const grpcClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'ecommerce.shipment.v1',
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

    client = grpcClient;
    service = grpcClient.getService<ShipmentServiceClient>('ShipmentService');

    producer = kafka.producer();
    await producer.connect();
  }, 30_000);

  afterAll(async () => {
    await shipmentModel?.deleteMany({ oid: testOid }).exec();
    await producer?.disconnect();
    client?.close();
    await app?.close();

    if (kafka) {
      const admin = kafka.admin();
      await admin.connect();

      try {
        const topics = await admin.listTopics();

        if (topics.includes(topic)) {
          await admin.deleteTopics({ topics: [topic] });
        }
      } finally {
        await admin.disconnect();
      }
    }

    restoreEnvironment('ORDER_CREATED_TOPIC', originalTopic);
    restoreEnvironment('SHIPMENT_CONSUMER_GROUP', originalConsumerGroup);
  }, 30_000);

  it('creates a pending shipment from an OrderCreated event', async () => {
    await producer.send({
      topic,
      messages: [
        {
          key: String(testOid),
          value: JSON.stringify({
            event_type: 'order.created',
            event_version: 1,
            correlation_id: 'shipment-e2e-order',
            occurred_at: new Date().toISOString(),
            data: {
              oid: testOid,
              uid: customerUid,
            },
          }),
        },
      ],
    });

    const response = await waitForShipmentByOrderId(testOid);

    expect(response.shipment).toMatchObject({
      oid: testOid,
      customerUid,
      status: ShipmentStatus.PENDING,
    });

    expect(response.shipment.shipid).toBeGreaterThan(0);
    expect(response.shipment.tracking).toHaveLength(1);
    expect(response.shipment.tracking[0]).toMatchObject({
      status: ShipmentStatus.PENDING,
      updatedByUid: 0,
    });

    await expect(
      shipmentModel?.countDocuments({ oid: testOid }).exec(),
    ).resolves.toBe(1);
  });

  it('returns the shipment through get and list gRPC APIs', async () => {
    const byOrder = await firstValueFrom(
      service.getShipmentByOrderId({
        oid: testOid,
      }),
    );

    const byShipmentId = await firstValueFrom(
      service.getShipment({
        shipid: byOrder.shipment.shipid,
      }),
    );

    expect(byShipmentId.shipment.oid).toBe(testOid);

    const list = await firstValueFrom(
      service.listShipments({
        page: 1,
        pageSize: 20,
        status: ShipmentStatus.PENDING,
        oid: testOid,
      }),
    );

    expect(list).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 20,
    });

    expect(list.shipments).toHaveLength(1);
    expect(list.shipments[0].oid).toBe(testOid);
  });

  it('updates status and rejects an invalid transition', async () => {
    const current = await firstValueFrom(
      service.getShipmentByOrderId({
        oid: testOid,
      }),
    );

    const updated = await firstValueFrom(
      service.updateShipmentStatus({
        shipid: current.shipment.shipid,
        status: ShipmentStatus.PROCESSING,
        note: 'Shipment is being prepared',
        updatedByUid: 9001,
      }),
    );

    expect(updated.shipment.status).toBe(ShipmentStatus.PROCESSING);
    expect(updated.shipment.tracking).toHaveLength(2);
    expect(updated.shipment.tracking[1]).toMatchObject({
      status: ShipmentStatus.PROCESSING,
      note: 'Shipment is being prepared',
      updatedByUid: 9001,
    });

    await expect(
      firstValueFrom(
        service.updateShipmentStatus({
          shipid: current.shipment.shipid,
          status: ShipmentStatus.DELIVERED,
          note: 'Invalid direct delivery',
          updatedByUid: 9001,
        }),
      ),
    ).rejects.toMatchObject({
      code: status.FAILED_PRECONDITION,
    });
  });

  async function waitForShipmentByOrderId(
    oid: number,
  ): Promise<ShipmentResponse> {
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      try {
        return await firstValueFrom(
          service.getShipmentByOrderId({
            oid,
          }),
        );
      } catch (error: unknown) {
        if (!isGrpcNotFound(error)) {
          throw error;
        }

        await new Promise<void>((resolve) => {
          setTimeout(resolve, 250);
        });
      }
    }

    throw new Error(`Timed out waiting for shipment of order ${oid}`);
  }

  function isGrpcNotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return (error as { code?: unknown }).code === status.NOT_FOUND;
  }

  function restoreEnvironment(key: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});
