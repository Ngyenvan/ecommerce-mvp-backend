export interface ClaimedOutboxEvent {
  eventId: string;
  aggregateId: number;
  eventType: string;
  payload: unknown;
  attempts: number;
  lockedAt: Date;
}

export abstract class OutboxRepository {
  abstract claimBatch(
    limit: number,
    now: Date,
    staleBefore: Date,
  ): Promise<ClaimedOutboxEvent[]>;

  abstract markPublished(
    eventId: string,
    lockedAt: Date,
    publishedAt: Date,
  ): Promise<void>;

  abstract markFailed(
    eventId: string,
    lockedAt: Date,
    attempts: number,
    nextAttemptAt: Date,
    error: string,
  ): Promise<void>;
}
