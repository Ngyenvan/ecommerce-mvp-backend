import { Module } from '@nestjs/common';
import { EventPublisher } from './ports/event-publisher';
import { OutboxPersistenceModule } from '../../infrastructure/database/outbox-persistence.module';
import { KafkaEventPublisher } from '../../infrastructure/messaging/kafka-event.publisher';
import { OutboxPublisherService } from './outbox-publisher.service';

@Module({
  imports: [OutboxPersistenceModule],
  providers: [
    OutboxPublisherService,
    KafkaEventPublisher,
    {
      provide: EventPublisher,
      useExisting: KafkaEventPublisher,
    },
  ],
})
export class OutboxPublisherModule {}
