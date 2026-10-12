import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryReservationRepository } from '../../domain/inventory/inventory-reservation.repository';
import { ProductRepository } from '../../domain/product/product.repository';
import { MongoInventoryReservationRepository } from './mongo-inventory-reservation.repository';
import { MongoProductRepository } from './mongo-product.repository';
import { ProductMongoModule } from './product-mongo.module';
import { COUNTER_MODEL_NAME, CounterSchema } from './schemas/counter.schema';
import {
  InventoryReservationDocument,
  InventoryReservationSchema,
} from './schemas/inventory-reservation.schema';
import { ProductDocument, ProductSchema } from './schemas/product.schema';

@Module({
  imports: [
    ProductMongoModule,
    MongooseModule.forFeature([
      {
        name: ProductDocument.name,
        schema: ProductSchema,
      },
      {
        name: COUNTER_MODEL_NAME,
        schema: CounterSchema,
      },
      {
        name: InventoryReservationDocument.name,
        schema: InventoryReservationSchema,
      },
    ]),
  ],
  providers: [
    MongoProductRepository,
    MongoInventoryReservationRepository,
    {
      provide: ProductRepository,
      useExisting: MongoProductRepository,
    },
    {
      provide: InventoryReservationRepository,
      useExisting: MongoInventoryReservationRepository,
    },
  ],
  exports: [ProductRepository, InventoryReservationRepository],
})
export class ProductPersistenceModule {}
