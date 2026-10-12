import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ShipmentStatus } from '../../../domain/shipment/shipment.entity';

@Schema({
  _id: false,
  versionKey: false,
})
export class TrackingEventDocument {
  @Prop({
    required: true,
    type: String,
    enum: Object.values(ShipmentStatus),
  })
  status!: ShipmentStatus;

  @Prop({
    required: true,
    type: String,
    maxlength: 500,
  })
  note!: string;

  @Prop({
    required: true,
    type: Number,
    min: 0,
  })
  updatedByUid!: number;

  @Prop({
    required: true,
    type: Date,
  })
  occurredAt!: Date;
}

export const TrackingEventSchema = SchemaFactory.createForClass(
  TrackingEventDocument,
);

@Schema({
  collection: 'shipments',
  timestamps: true,
  versionKey: false,
})
export class ShipmentDocument {
  @Prop({
    required: true,
    type: Number,
    unique: true,
    index: true,
    min: 1,
  })
  shipid!: number;

  @Prop({
    required: true,
    type: Number,
    unique: true,
    index: true,
    min: 1,
  })
  oid!: number;

  @Prop({
    required: true,
    type: Number,
    index: true,
    min: 1,
  })
  customerUid!: number;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(ShipmentStatus),
    index: true,
  })
  status!: ShipmentStatus;

  @Prop({
    required: true,
    type: [TrackingEventSchema],
    default: [],
  })
  tracking!: TrackingEventDocument[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type ShipmentMongoDocument = HydratedDocument<ShipmentDocument>;

export const ShipmentSchema = SchemaFactory.createForClass(ShipmentDocument);
