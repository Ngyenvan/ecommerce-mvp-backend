import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPublisher } from './ports/event-publisher';
import {
  ClaimedOutboxEvent,
  OutboxRepository,
} from './ports/outbox.repository';

@Injectable()
export class OutboxPublisherService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly lockTimeoutMs: number;
  private readonly orderCreatedTopic: string;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly publisher: EventPublisher,
    configService: ConfigService,
  ) {
    this.pollIntervalMs = this.readPositiveInteger(
      configService,
      'OUTBOX_POLL_INTERVAL_MS',
      1_000,
    );
    this.batchSize = this.readPositiveInteger(
      configService,
      'OUTBOX_BATCH_SIZE',
      10,
    );
    this.lockTimeoutMs = this.readPositiveInteger(
      configService,
      'OUTBOX_LOCK_TIMEOUT_MS',
      60_000,
    );
    this.orderCreatedTopic =
      configService.get<string>('ORDER_CREATED_TOPIC') ?? 'order-created';
  }

  onApplicationBootstrap(): void {
    void this.publishPending();
    this.timer = setInterval(() => {
      void this.publishPending();
    }, this.pollIntervalMs);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async publishPending(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const now = new Date();
      const staleBefore = new Date(now.getTime() - this.lockTimeoutMs);
      const events = await this.outbox.claimBatch(
        this.batchSize,
        now,
        staleBefore,
      );

      for (const event of events) {
        await this.publishEvent(event);
      }
    } catch (error: unknown) {
      this.logger.error(`Outbox polling failed: ${this.errorMessage(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async publishEvent(event: ClaimedOutboxEvent): Promise<void> {
    try {
      const topic = this.topicFor(event.eventType);
      await this.publisher.publish(
        topic,
        String(event.aggregateId),
        event.payload,
      );
      await this.outbox.markPublished(
        event.eventId,
        event.lockedAt,
        new Date(),
      );
    } catch (error: unknown) {
      const attempts = event.attempts + 1;
      const retryDelayMs = Math.min(1_000 * 2 ** (attempts - 1), 60_000);
      const nextAttemptAt = new Date(Date.now() + retryDelayMs);
      const message = this.errorMessage(error);

      await this.outbox.markFailed(
        event.eventId,
        event.lockedAt,
        attempts,
        nextAttemptAt,
        message,
      );
      this.logger.warn(
        `Publishing outbox event ${event.eventId} failed; retry ${attempts} scheduled: ${message}`,
      );
    }
  }

  private topicFor(eventType: string): string {
    if (eventType === 'order.created') {
      return this.orderCreatedTopic;
    }

    throw new Error(`Unsupported outbox event type: ${eventType}`);
  }

  private readPositiveInteger(
    configService: ConfigService,
    key: string,
    fallback: number,
  ): number {
    const raw = configService.get<string>(key);
    const value = raw === undefined ? fallback : Number(raw);

    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${key} must be a positive integer`);
    }

    return value;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
