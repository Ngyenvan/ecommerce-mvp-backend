import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Partitioners, type Producer } from 'kafkajs';
import { EventPublisher } from '../../application/outbox/ports/event-publisher';

@Injectable()
export class KafkaEventPublisher implements EventPublisher, OnModuleDestroy {
  private readonly producer: Producer;
  private connectPromise?: Promise<void>;
  private connected = false;

  constructor(configService: ConfigService) {
    const brokers = (
      configService.get<string>('KAFKA_BROKERS') ?? 'localhost:9092'
    )
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);

    this.producer = new Kafka({
      clientId: 'ecommerce-order-service',
      brokers,
    }).producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
  }

  async publish(topic: string, key: string, payload: unknown): Promise<void> {
    await this.ensureConnected();
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(payload) }],
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.connectPromise ??= this.producer
      .connect()
      .then(() => {
        this.connected = true;
      })
      .catch((error: unknown) => {
        this.connectPromise = undefined;
        throw error;
      });

    await this.connectPromise;
  }
}
