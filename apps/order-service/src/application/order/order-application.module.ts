import { Module } from '@nestjs/common';
import { OrderPersistenceModule } from '../../infrastructure/database/order-persistence.module';
import { OrderDownstreamGrpcModule } from '../../infrastructure/grpc/order-downstream-grpc.module';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { GetOrderUseCase } from './use-cases/get-order.use-case';
import { ListOrdersUseCase } from './use-cases/list-orders.use-case';

const orderUseCases = [CreateOrderUseCase, GetOrderUseCase, ListOrdersUseCase];

@Module({
  imports: [OrderPersistenceModule, OrderDownstreamGrpcModule],
  providers: orderUseCases,
  exports: orderUseCases,
})
export class OrderApplicationModule {}
