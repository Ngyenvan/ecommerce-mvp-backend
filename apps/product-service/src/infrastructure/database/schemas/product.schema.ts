import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

@Schema({
  collection: 'products',
  timestamps: true,
  versionKey: false,
})
export class ProductDocument {
  @Prop({
    required: true,
    unique: true,
    index: true,
    min: 1,
  })
  pid!: number;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  pname!: string;

  @Prop({
    required: true,
    type: SchemaTypes.Decimal128,
  })
  price!: Types.Decimal128;

  @Prop({
    required: true,
    min: 0,
  })
  quantity!: number;

  @Prop({
    required: true,
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProductMongoDocument = HydratedDocument<ProductDocument>;

export const ProductSchema = SchemaFactory.createForClass(ProductDocument);
