import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { InventoryReservationStatus } from '../../../domain/inventory/inventory-reservation.entity';

@Schema({
  _id: false,
  versionKey: false,
})
export class ReservedProductDocument {
  @Prop({
    required: true,
    min: 1,
  })
  pid!: number;

  @Prop({
    required: true,
    maxlength: 100,
  })
  pname!: string;

  @Prop({
    required: true,
    type: SchemaTypes.Decimal128,
  })
  unitPrice!: Types.Decimal128;

  @Prop({
    required: true,
    min: 1,
  })
  qty!: number;
}

export const ReservedProductSchema = SchemaFactory.createForClass(
  ReservedProductDocument,
);

@Schema({
  collection: 'inventory_reservations',
  timestamps: true,
  versionKey: false,
})
export class InventoryReservationDocument {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  reservationId!: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(InventoryReservationStatus),
    index: true,
  })
  status!: InventoryReservationStatus;

  @Prop({
    required: true,
    type: [ReservedProductSchema],
  })
  products!: ReservedProductDocument[];

  @Prop({
    required: false,
    maxlength: 255,
  })
  releaseReason?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type InventoryReservationMongoDocument =
  HydratedDocument<InventoryReservationDocument>;

export const InventoryReservationSchema = SchemaFactory.createForClass(
  InventoryReservationDocument,
);
