import { Module } from '@nestjs/common';
import { ShipmentPersistenceModule } from '../../infrastructure/database/shipment-persistence.module';
import { CreateShipmentFromOrderUseCase } from './use-cases/create-shipment-from-order.use-case';
import { GetShipmentByOrderIdUseCase } from './use-cases/get-shipment-by-order-id.use-case';
import { GetShipmentUseCase } from './use-cases/get-shipment.use-case';
import { ListShipmentsUseCase } from './use-cases/list-shipments.use-case';
import { UpdateShipmentStatusUseCase } from './use-cases/update-shipment-status.use-case';

const shipmentUseCases = [
  CreateShipmentFromOrderUseCase,
  GetShipmentUseCase,
  GetShipmentByOrderIdUseCase,
  ListShipmentsUseCase,
  UpdateShipmentStatusUseCase,
];

@Module({
  imports: [ShipmentPersistenceModule],
  providers: shipmentUseCases,
  exports: shipmentUseCases,
})
export class ShipmentApplicationModule {}
