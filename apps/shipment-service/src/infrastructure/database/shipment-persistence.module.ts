import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShipmentRepository } from '../../domain/shipment/shipment.repository';
import { MongoShipmentRepository } from './mongo-shipment.repository';
import { COUNTER_MODEL_NAME, CounterSchema } from './schemas/counter.schema';
import { ShipmentDocument, ShipmentSchema } from './schemas/shipment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ShipmentDocument.name,
        schema: ShipmentSchema,
      },
      {
        name: COUNTER_MODEL_NAME,
        schema: CounterSchema,
      },
    ]),
  ],
  providers: [
    MongoShipmentRepository,
    {
      provide: ShipmentRepository,
      useExisting: MongoShipmentRepository,
    },
  ],
  exports: [ShipmentRepository],
})
export class ShipmentPersistenceModule {}
