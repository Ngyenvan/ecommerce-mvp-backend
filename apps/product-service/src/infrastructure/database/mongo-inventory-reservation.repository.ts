import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  InventoryReservationEntity,
  InventoryReservationStatus,
  ReservedProductSnapshot,
} from '../../domain/inventory/inventory-reservation.entity';
import { InsufficientInventoryError } from '../../domain/inventory/inventory-reservation.errors';
import {
  InventoryRequestItem,
  InventoryReservationRepository,
} from '../../domain/inventory/inventory-reservation.repository';
import { InventoryReservationDocument } from './schemas/inventory-reservation.schema';
import { ProductDocument } from './schemas/product.schema';

@Injectable()
export class MongoInventoryReservationRepository extends InventoryReservationRepository {
  constructor(
    @InjectModel(ProductDocument.name)
    private readonly products: Model<ProductDocument>,
    @InjectModel(InventoryReservationDocument.name)
    private readonly reservations: Model<InventoryReservationDocument>,
  ) {
    super();
  }

  async reserve(
    items: InventoryRequestItem[],
  ): Promise<InventoryReservationEntity> {
    const reservedProducts: ReservedProductSnapshot[] = [];

    try {
      for (const item of items) {
        const product = await this.products
          .findOneAndUpdate(
            {
              pid: item.pid,
              isActive: true,
              quantity: {
                $gte: item.qty,
              },
            },
            {
              $inc: {
                quantity: -item.qty,
              },
            },
            {
              returnDocument: 'after',
            },
          )
          .exec();

        if (!product) {
          throw new InsufficientInventoryError(item.pid);
        }

        reservedProducts.push({
          pid: product.pid,
          pname: product.pname,
          unitPrice: product.price.toString(),
          qty: item.qty,
        });
      }

      const reservation = InventoryReservationEntity.createReserved(
        randomUUID(),
        reservedProducts,
      );

      const record = await this.reservations.create({
        reservationId: reservation.reservationId,
        status: reservation.status,
        products: reservation.products.map((product) => ({
          pid: product.pid,
          pname: product.pname,
          unitPrice: Types.Decimal128.fromString(product.unitPrice),
          qty: product.qty,
        })),
      });

      return this.toDomain(record);
    } catch (error: unknown) {
      await this.restoreStock(reservedProducts);
      throw error;
    }
  }

  async findById(
    reservationId: string,
  ): Promise<InventoryReservationEntity | null> {
    const record = await this.reservations
      .findOne({
        reservationId,
      })
      .exec();

    return record ? this.toDomain(record) : null;
  }

  async save(
    reservation: InventoryReservationEntity,
  ): Promise<InventoryReservationEntity> {
    if (reservation.status === InventoryReservationStatus.CONFIRMED) {
      const record = await this.reservations
        .findOneAndUpdate(
          {
            reservationId: reservation.reservationId,
            status: InventoryReservationStatus.RESERVED,
          },
          {
            $set: {
              status: InventoryReservationStatus.CONFIRMED,
            },
          },
          {
            returnDocument: 'after',
          },
        )
        .exec();

      return record
        ? this.toDomain(record)
        : this.findCurrentReservation(reservation.reservationId);
    }

    if (reservation.status === InventoryReservationStatus.RELEASED) {
      const record = await this.reservations
        .findOneAndUpdate(
          {
            reservationId: reservation.reservationId,
            status: InventoryReservationStatus.RESERVED,
          },
          {
            $set: {
              status: InventoryReservationStatus.RELEASED,
              releaseReason: reservation.releaseReason,
            },
          },
          {
            returnDocument: 'after',
          },
        )
        .exec();

      if (!record) {
        return this.findCurrentReservation(reservation.reservationId);
      }

      await this.restoreStock(reservation.products);

      return this.toDomain(record);
    }

    return this.findCurrentReservation(reservation.reservationId);
  }

  private async findCurrentReservation(
    reservationId: string,
  ): Promise<InventoryReservationEntity> {
    const record = await this.reservations
      .findOne({
        reservationId,
      })
      .exec();

    if (!record) {
      throw new Error(`Inventory reservation ${reservationId} was not found`);
    }

    return this.toDomain(record);
  }

  private async restoreStock(
    products: ReservedProductSnapshot[],
  ): Promise<void> {
    if (products.length === 0) {
      return;
    }

    await this.products.bulkWrite(
      products.map((product) => ({
        updateOne: {
          filter: {
            pid: product.pid,
          },
          update: {
            $inc: {
              quantity: product.qty,
            },
          },
        },
      })),
    );
  }

  private toDomain(
    record: InventoryReservationDocument,
  ): InventoryReservationEntity {
    return InventoryReservationEntity.restore({
      reservationId: record.reservationId,
      status: record.status,
      products: record.products.map((product) => ({
        pid: product.pid,
        pname: product.pname,
        unitPrice: product.unitPrice.toString(),
        qty: product.qty,
      })),
      releaseReason: record.releaseReason,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
