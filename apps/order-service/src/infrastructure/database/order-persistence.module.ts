import { Module } from '@nestjs/common';
import { OrderRepository } from '../../domain/order/order.repository';
import { PrismaModule } from './prisma.module';
import { PrismaOrderRepository } from './prisma-order.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaOrderRepository,
    {
      provide: OrderRepository,
      useExisting: PrismaOrderRepository,
    },
  ],
  exports: [OrderRepository],
})
export class OrderPersistenceModule {}
