import { Module } from '@nestjs/common';
import { ShipmentApplicationModule } from '../../application/shipment/shipment-application.module';
import { ShipmentGrpcController } from './shipment-grpc.controller';

@Module({
  imports: [ShipmentApplicationModule],
  controllers: [ShipmentGrpcController],
})
export class ShipmentGrpcModule {}
