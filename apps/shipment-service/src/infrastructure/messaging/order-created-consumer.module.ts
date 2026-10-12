import { Module } from '@nestjs/common';
import { ShipmentApplicationModule } from '../../application/shipment/shipment-application.module';
import { OrderCreatedConsumerService } from './order-created-consumer.service';

@Module({
  imports: [ShipmentApplicationModule],
  providers: [OrderCreatedConsumerService],
})
export class OrderCreatedConsumerModule {}
