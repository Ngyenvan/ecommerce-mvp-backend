import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { ProductEntity } from '../../domain/product/product.entity';
import {
  ListProductsQuery,
  ProductPage,
  ProductRepository,
} from '../../domain/product/product.repository';
import { COUNTER_MODEL_NAME, CounterRecord } from './schemas/counter.schema';
import { ProductDocument } from './schemas/product.schema';

@Injectable()
export class MongoProductRepository extends ProductRepository {
  constructor(
    @InjectModel(ProductDocument.name)
    private readonly products: Model<ProductDocument>,
    @InjectModel(COUNTER_MODEL_NAME)
    private readonly counters: Model<CounterRecord>,
  ) {
    super();
  }

  async findByPid(pid: number): Promise<ProductEntity | null> {
    const record = await this.products.findOne({ pid }).exec();

    return record ? this.toDomain(record) : null;
  }

  async list(query: ListProductsQuery): Promise<ProductPage> {
    const filter: QueryFilter<ProductDocument> = {
      isActive: true,
    };

    const normalizedSearch = query.search.trim();

    if (normalizedSearch.length > 0) {
      filter.pname = {
        $regex: this.escapeRegex(normalizedSearch),
        $options: 'i',
      };
    }

    const skip = (query.page - 1) * query.pageSize;

    const [records, total] = await Promise.all([
      this.products
        .find(filter)
        .sort({ pid: 1 })
        .skip(skip)
        .limit(query.pageSize)
        .exec(),
      this.products.countDocuments(filter).exec(),
    ]);

    return {
      products: records.map((record) => this.toDomain(record)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async create(product: ProductEntity): Promise<ProductEntity> {
    if (product.pid !== undefined) {
      throw new Error('Cannot create a product that already has an id');
    }

    const counter = await this.counters
      .findOneAndUpdate(
        { _id: 'product_pid' },
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
      throw new Error('Could not allocate a product id');
    }

    const record = await this.products.create({
      pid: counter.sequence,
      pname: product.pname,
      price: Types.Decimal128.fromString(product.price),
      quantity: product.quantity,
      isActive: product.isActive,
    });

    return this.toDomain(record);
  }

  async update(product: ProductEntity): Promise<ProductEntity> {
    if (product.pid === undefined) {
      throw new Error('Cannot update a product without an id');
    }

    const record = await this.products
      .findOneAndUpdate(
        {
          pid: product.pid,
        },
        {
          $set: {
            pname: product.pname,
            price: Types.Decimal128.fromString(product.price),
            quantity: product.quantity,
            isActive: product.isActive,
          },
        },
        {
          returnDocument: 'after',
        },
      )
      .exec();

    if (!record) {
      throw new Error(`Product ${product.pid} was not found`);
    }

    return this.toDomain(record);
  }

  private toDomain(record: ProductDocument): ProductEntity {
    return ProductEntity.restore({
      pid: record.pid,
      pname: record.pname,
      price: record.price.toString(),
      quantity: record.quantity,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
