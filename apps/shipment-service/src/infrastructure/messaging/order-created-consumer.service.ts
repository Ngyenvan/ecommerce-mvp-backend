import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, KafkaMessage } from 'kafkajs';
import { CreateShipmentFromOrderUseCase } from '../../application/shipment/use-cases/create-shipment-from-order.use-case';

interface OrderCreatedEvent {
  event_type: 'order.created';
  event_version: 1;
  data: {
    oid: number;
    uid: number;
  };
}

@Injectable()
export class OrderCreatedConsumerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OrderCreatedConsumerService.name);
  private readonly consumer: Consumer;
  private readonly topic: string;
  private started = false;

  constructor(
    private readonly createShipment: CreateShipmentFromOrderUseCase,
    configService: ConfigService,
  ) {
    const brokers = (
      configService.get<string>('KAFKA_BROKERS') ?? 'localhost:9092'
    )
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);

    const groupId =
      configService.get<string>('SHIPMENT_CONSUMER_GROUP') ??
      'ecommerce-shipment-service';

    this.topic =
      configService.get<string>('ORDER_CREATED_TOPIC') ?? 'order-created';

    this.consumer = new Kafka({
      clientId: 'ecommerce-shipment-service',
      brokers,
      retry: {
        retries: 10,
      },
    }).consumer({
      groupId,
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.topic,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }: { message: KafkaMessage }) => {
        await this.handleMessage(message.value);
      },
    });

    this.started = true;
    this.logger.log(`Listening for OrderCreated events on topic ${this.topic}`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.started) {
      await this.consumer.disconnect();
      this.started = false;
    }
  }

  async handleMessage(value: Buffer | null): Promise<void> {
    if (!value) {
      this.logger.warn('Ignoring OrderCreated event with empty value');
      return;
    }

    let event: unknown;

    try {
      event = JSON.parse(value.toString());
    } catch {
      this.logger.warn('Ignoring malformed OrderCreated JSON');
      return;
    }

    if (!this.isOrderCreatedEvent(event)) {
      this.logger.warn('Ignoring invalid OrderCreated event');
      return;
    }

    try {
      const shipment = await this.createShipment.execute({
        oid: event.data.oid,
        customerUid: event.data.uid,
      });

      this.logger.log(
        `Shipment ${shipment.shipid} is ready for order ${event.data.oid}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Could not create shipment for order ${event.data.oid}: ${message}`,
      );

      throw error;
    }
  }

  private isOrderCreatedEvent(value: unknown): value is OrderCreatedEvent {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('event_type' in value) ||
      !('event_version' in value) ||
      !('data' in value)
    ) {
      return false;
    }

    const candidate = value as {
      event_type?: unknown;
      event_version?: unknown;
      data?: unknown;
    };

    if (
      candidate.event_type !== 'order.created' ||
      candidate.event_version !== 1 ||
      typeof candidate.data !== 'object' ||
      candidate.data === null
    ) {
      return false;
    }

    const data = candidate.data as {
      oid?: unknown;
      uid?: unknown;
    };

    return (
      typeof data.oid === 'number' &&
      Number.isInteger(data.oid) &&
      data.oid > 0 &&
      typeof data.uid === 'number' &&
      Number.isInteger(data.uid) &&
      data.uid > 0
    );
  }
}
