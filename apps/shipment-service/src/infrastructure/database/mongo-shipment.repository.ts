import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { ShipmentEntity } from '../../domain/shipment/shipment.entity';
import {
  ListShipmentsQuery,
  ShipmentPage,
  ShipmentRepository,
} from '../../domain/shipment/shipment.repository';
import { COUNTER_MODEL_NAME, CounterRecord } from './schemas/counter.schema';
import { ShipmentDocument } from './schemas/shipment.schema';

@Injectable()
export class MongoShipmentRepository extends ShipmentRepository {
  constructor(
    @InjectModel(ShipmentDocument.name)
    private readonly shipments: Model<ShipmentDocument>,
    @InjectModel(COUNTER_MODEL_NAME)
    private readonly counters: Model<CounterRecord>,
  ) {
    super();
  }

  async findByShipid(shipid: number): Promise<ShipmentEntity | null> {
    const record = await this.shipments.findOne({ shipid }).exec();

    return record ? this.toDomain(record) : null;
  }

  async findByOid(oid: number): Promise<ShipmentEntity | null> {
    const record = await this.shipments.findOne({ oid }).exec();

    return record ? this.toDomain(record) : null;
  }

  async list(query: ListShipmentsQuery): Promise<ShipmentPage> {
    const filter: QueryFilter<ShipmentDocument> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.oid !== undefined) {
      filter.oid = query.oid;
    }

    const skip = (query.page - 1) * query.pageSize;

    const [records, total] = await Promise.all([
      this.shipments
        .find(filter)
        .sort({ shipid: -1 })
        .skip(skip)
        .limit(query.pageSize)
        .exec(),
      this.shipments.countDocuments(filter).exec(),
    ]);

    return {
      shipments: records.map((record) => this.toDomain(record)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async create(shipment: ShipmentEntity): Promise<ShipmentEntity> {
    if (shipment.shipid !== undefined) {
      throw new Error('Cannot create a shipment that already has an id');
    }

    const counter = await this.counters
      .findOneAndUpdate(
        { _id: 'shipment_shipid' },
        {
          $inc: {
            sequence: 1,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      )
      .exec();

    if (!counter) {
      throw new Error('Could not allocate a shipment id');
    }

    const record = await this.shipments.create({
      shipid: counter.sequence,
      oid: shipment.oid,
      customerUid: shipment.customerUid,
      status: shipment.status,
      tracking: shipment.tracking,
    });

    return this.toDomain(record);
  }

  async update(shipment: ShipmentEntity): Promise<ShipmentEntity> {
    if (shipment.shipid === undefined) {
      throw new Error('Cannot update a shipment without an id');
    }

    const record = await this.shipments
      .findOneAndUpdate(
        {
          shipid: shipment.shipid,
        },
        {
          $set: {
            status: shipment.status,
            tracking: shipment.tracking,
          },
        },
        {
          returnDocument: 'after',
        },
      )
      .exec();

    if (!record) {
      throw new Error(`Shipment ${shipment.shipid} was not found`);
    }

    return this.toDomain(record);
  }

  private toDomain(record: ShipmentDocument): ShipmentEntity {
    return ShipmentEntity.restore({
      shipid: record.shipid,
      oid: record.oid,
      customerUid: record.customerUid,
      status: record.status,
      tracking: record.tracking.map((event) => ({
        status: event.status,
        note: event.note,
        updatedByUid: event.updatedByUid,
        occurredAt: event.occurredAt,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
