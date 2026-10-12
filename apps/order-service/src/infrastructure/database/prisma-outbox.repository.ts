import { Injectable } from '@nestjs/common';
import {
  ClaimedOutboxEvent,
  OutboxRepository,
} from '../../application/outbox/ports/outbox.repository';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claimBatch(
    limit: number,
    now: Date,
    staleBefore: Date,
  ): Promise<ClaimedOutboxEvent[]> {
    const candidates = await this.prisma.outboxEvent.findMany({
      where: {
        OR: [
          {
            status: { in: ['PENDING', 'FAILED'] },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          {
            status: 'PROCESSING',
            lockedAt: { lte: staleBefore },
          },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { eventId: 'asc' }],
      take: limit,
    });

    const claimed: ClaimedOutboxEvent[] = [];

    for (const candidate of candidates) {
      const result = await this.prisma.outboxEvent.updateMany({
        where: {
          eventId: candidate.eventId,
          status: candidate.status,
          updatedAt: candidate.updatedAt,
        },
        data: {
          status: 'PROCESSING',
          lockedAt: now,
        },
      });

      if (result.count === 1) {
        claimed.push({
          eventId: candidate.eventId,
          aggregateId: candidate.aggregateId,
          eventType: candidate.eventType,
          payload: candidate.payload,
          attempts: candidate.attempts,
          lockedAt: now,
        });
      }
    }

    return claimed;
  }

  async markPublished(
    eventId: string,
    lockedAt: Date,
    publishedAt: Date,
  ): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: { eventId, status: 'PROCESSING', lockedAt },
      data: {
        status: 'PUBLISHED',
        publishedAt,
        nextAttemptAt: null,
        lockedAt: null,
        lastError: null,
      },
    });
  }

  async markFailed(
    eventId: string,
    lockedAt: Date,
    attempts: number,
    nextAttemptAt: Date,
    error: string,
  ): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: { eventId, status: 'PROCESSING', lockedAt },
      data: {
        status: 'FAILED',
        attempts,
        nextAttemptAt,
        lockedAt: null,
        lastError: error.slice(0, 4_000),
      },
    });
  }
}
