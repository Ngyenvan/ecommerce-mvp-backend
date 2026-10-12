import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../application/outbox/ports/outbox.repository';
import { PrismaModule } from './prisma.module';
import { PrismaOutboxRepository } from './prisma-outbox.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaOutboxRepository,
    {
      provide: OutboxRepository,
      useExisting: PrismaOutboxRepository,
    },
  ],
  exports: [OutboxRepository],
})
export class OutboxPersistenceModule {}
