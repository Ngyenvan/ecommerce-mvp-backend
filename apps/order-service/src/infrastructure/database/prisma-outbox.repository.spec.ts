import { PrismaOutboxRepository } from './prisma-outbox.repository';
import { PrismaService } from './prisma.service';

describe('PrismaOutboxRepository', () => {
  const now = new Date('2026-10-12T10:00:00.000Z');
  const staleBefore = new Date('2026-10-12T09:59:00.000Z');
  const candidate = {
    eventId: 'event-001',
    aggregateId: 1001,
    eventType: 'order.created',
    payload: { event_id: 'event-001' },
    status: 'PENDING' as const,
    attempts: 0,
    nextAttemptAt: now,
    lockedAt: null,
    publishedAt: null,
    lastError: null,
    createdAt: new Date('2026-10-12T09:00:00.000Z'),
    updatedAt: new Date('2026-10-12T09:00:00.000Z'),
  };
  const prisma = {
    outboxEvent: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('claims an eligible event using a compare-and-set update', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([candidate]);
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    const repository = new PrismaOutboxRepository(
      prisma as unknown as PrismaService,
    );

    const claimed = await repository.claimBatch(10, now, staleBefore);

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: {
        eventId: 'event-001',
        status: 'PENDING',
        updatedAt: candidate.updatedAt,
      },
      data: { status: 'PROCESSING', lockedAt: now },
    });
    expect(claimed).toEqual([
      expect.objectContaining({
        eventId: 'event-001',
        lockedAt: now,
      }),
    ]);
  });

  it('skips an event claimed by another service instance', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([candidate]);
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 0 });
    const repository = new PrismaOutboxRepository(
      prisma as unknown as PrismaService,
    );

    await expect(repository.claimBatch(10, now, staleBefore)).resolves.toEqual(
      [],
    );
  });

  it('marks a failed event for a later retry using its lock token', async () => {
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    const repository = new PrismaOutboxRepository(
      prisma as unknown as PrismaService,
    );
    const retryAt = new Date('2026-10-12T10:00:04.000Z');

    await repository.markFailed(
      'event-001',
      now,
      3,
      retryAt,
      'Kafka unavailable',
    );

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { eventId: 'event-001', status: 'PROCESSING', lockedAt: now },
      data: {
        status: 'FAILED',
        attempts: 3,
        nextAttemptAt: retryAt,
        lockedAt: null,
        lastError: 'Kafka unavailable',
      },
    });
  });
});
