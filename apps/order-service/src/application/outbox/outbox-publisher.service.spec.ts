import { ConfigService } from '@nestjs/config';
import { EventPublisher } from './ports/event-publisher';
import { OutboxRepository } from './ports/outbox.repository';
import { OutboxPublisherService } from './outbox-publisher.service';

describe('OutboxPublisherService', () => {
  const lockedAt = new Date('2026-10-12T10:00:00.000Z');
  const event = {
    eventId: 'event-001',
    aggregateId: 1001,
    eventType: 'order.created',
    payload: { event_id: 'event-001' },
    attempts: 0,
    lockedAt,
  };
  const outbox = {
    claimBatch: jest.fn(),
    markPublished: jest.fn(),
    markFailed: jest.fn(),
  };
  const publisher = {
    publish: jest.fn(),
  };

  let service: OutboxPublisherService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new OutboxPublisherService(
      outbox as unknown as OutboxRepository,
      publisher as unknown as EventPublisher,
      new ConfigService({
        ORDER_CREATED_TOPIC: 'orders-test',
        OUTBOX_BATCH_SIZE: '5',
        OUTBOX_LOCK_TIMEOUT_MS: '30000',
      }),
    );
  });

  it('publishes a claimed event and marks it as published', async () => {
    outbox.claimBatch.mockResolvedValue([event]);
    publisher.publish.mockResolvedValue(undefined);
    outbox.markPublished.mockResolvedValue(undefined);

    await service.publishPending();

    expect(outbox.claimBatch).toHaveBeenCalledWith(
      5,
      expect.any(Date),
      expect.any(Date),
    );
    expect(publisher.publish).toHaveBeenCalledWith(
      'orders-test',
      '1001',
      event.payload,
    );
    expect(outbox.markPublished).toHaveBeenCalledWith(
      'event-001',
      lockedAt,
      expect.any(Date),
    );
    expect(outbox.markFailed).not.toHaveBeenCalled();
  });

  it('schedules exponential retry when Kafka publishing fails', async () => {
    outbox.claimBatch.mockResolvedValue([{ ...event, attempts: 2 }]);
    publisher.publish.mockRejectedValue(new Error('Kafka unavailable'));
    outbox.markFailed.mockResolvedValue(undefined);
    const before = Date.now();

    await service.publishPending();

    expect(outbox.markFailed).toHaveBeenCalledWith(
      'event-001',
      lockedAt,
      3,
      expect.any(Date),
      'Kafka unavailable',
    );
    const nextAttemptAt = outbox.markFailed.mock.calls[0][3] as Date;
    expect(nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 4_000);
    expect(outbox.markPublished).not.toHaveBeenCalled();
  });

  it('does not start a second polling cycle while one is running', async () => {
    let finishClaim: ((events: never[]) => void) | undefined;
    outbox.claimBatch.mockImplementation(
      () =>
        new Promise<never[]>((resolve) => {
          finishClaim = resolve;
        }),
    );

    const firstCycle = service.publishPending();
    await service.publishPending();

    expect(outbox.claimBatch).toHaveBeenCalledTimes(1);
    finishClaim?.([]);
    await firstCycle;
  });
});
