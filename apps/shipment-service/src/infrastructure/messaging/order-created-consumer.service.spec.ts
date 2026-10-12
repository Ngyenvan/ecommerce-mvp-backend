import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateShipmentFromOrderUseCase } from '../../application/shipment/use-cases/create-shipment-from-order.use-case';
import { ShipmentStatus } from '../../domain/shipment/shipment.entity';
import { OrderCreatedConsumerService } from './order-created-consumer.service';

describe('OrderCreatedConsumerService', () => {
  const createShipment = {
    execute: jest.fn(),
  };

  let consumer: OrderCreatedConsumerService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    consumer = new OrderCreatedConsumerService(
      createShipment as unknown as CreateShipmentFromOrderUseCase,
      new ConfigService({
        KAFKA_BROKERS: 'localhost:9092',
        ORDER_CREATED_TOPIC: 'order-created-test',
        SHIPMENT_CONSUMER_GROUP: 'shipment-test',
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a shipment from a valid OrderCreated event', async () => {
    createShipment.execute.mockResolvedValue({
      shipid: 1,
      oid: 1001,
      customerUid: 10,
      status: ShipmentStatus.PENDING,
      tracking: [],
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    });

    await consumer.handleMessage(
      Buffer.from(
        JSON.stringify({
          event_type: 'order.created',
          event_version: 1,
          data: {
            oid: 1001,
            uid: 10,
          },
        }),
      ),
    );

    expect(createShipment.execute).toHaveBeenCalledWith({
      oid: 1001,
      customerUid: 10,
    });
  });

  it('ignores an empty Kafka message', async () => {
    await consumer.handleMessage(null);

    expect(createShipment.execute).not.toHaveBeenCalled();
  });

  it('ignores malformed JSON', async () => {
    await consumer.handleMessage(Buffer.from('{invalid-json'));

    expect(createShipment.execute).not.toHaveBeenCalled();
  });

  it('ignores an event with invalid order data', async () => {
    await consumer.handleMessage(
      Buffer.from(
        JSON.stringify({
          event_type: 'order.created',
          event_version: 1,
          data: {
            oid: 0,
            uid: 10,
          },
        }),
      ),
    );

    expect(createShipment.execute).not.toHaveBeenCalled();
  });

  it('rethrows persistence errors so Kafka can retry', async () => {
    createShipment.execute.mockRejectedValue(new Error('MongoDB unavailable'));

    await expect(
      consumer.handleMessage(
        Buffer.from(
          JSON.stringify({
            event_type: 'order.created',
            event_version: 1,
            data: {
              oid: 1001,
              uid: 10,
            },
          }),
        ),
      ),
    ).rejects.toThrow('MongoDB unavailable');
  });
});
