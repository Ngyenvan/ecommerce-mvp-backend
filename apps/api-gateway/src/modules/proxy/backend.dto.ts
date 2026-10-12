import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @Length(2, 100)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(5, 30)
  phone!: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(5, 30)
  phone?: string;
}

export class AdjustScoreDto {
  @IsInt()
  scoreDelta!: number;

  @IsString()
  @Length(1, 200)
  reason!: string;

  @IsString()
  @Length(1, 100)
  referenceId!: string;
}

export class CreateMembershipDto {
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsInt()
  @Min(0)
  minScore!: number;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  discountPercent!: string;
}

export class UpdateMembershipDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minScore?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  discountPercent?: string;
}

export class ListProductsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  search = '';
}

export class CreateProductDto {
  @IsString()
  @Length(1, 100)
  pname!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  price!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  pname?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  price?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  pid!: number;

  @IsInt()
  @Min(1)
  qty!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsString()
  @Length(1, 100)
  clientRequestId!: string;
}

export class ListOrdersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerUid?: number;
}

export class ListShipmentsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  @IsIn([
    'SHIPMENT_STATUS_PENDING',
    'SHIPMENT_STATUS_PROCESSING',
    'SHIPMENT_STATUS_SHIPPED',
    'SHIPMENT_STATUS_DELIVERED',
    'SHIPMENT_STATUS_FAILED',
    'SHIPMENT_STATUS_CANCELLED',
  ])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  oid?: number;
}

export class UpdateShipmentStatusDto {
  @IsString()
  @IsIn([
    'SHIPMENT_STATUS_PROCESSING',
    'SHIPMENT_STATUS_SHIPPED',
    'SHIPMENT_STATUS_DELIVERED',
    'SHIPMENT_STATUS_FAILED',
    'SHIPMENT_STATUS_CANCELLED',
  ])
  status!: string;

  @IsString()
  @Length(1, 500)
  note!: string;
}
