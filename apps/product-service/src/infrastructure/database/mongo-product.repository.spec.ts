import { Model, Types } from 'mongoose';
import { ProductEntity } from '../../domain/product/product.entity';
import { CounterRecord } from './schemas/counter.schema';
import { ProductDocument } from './schemas/product.schema';
import { MongoProductRepository } from './mongo-product.repository';

describe('MongoProductRepository', () => {
  const products = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const counters = {
    findOneAndUpdate: jest.fn(),
  };

  let repository: MongoProductRepository;

  const now = new Date('2026-10-12T10:00:00.000Z');

  function productRecord(
    overrides: Partial<ProductDocument> = {},
  ): ProductDocument {
    return {
      pid: 1,
      pname: 'Keyboard',
      price: Types.Decimal128.fromString('99.90'),
      quantity: 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.resetAllMocks();

    repository = new MongoProductRepository(
      products as unknown as Model<ProductDocument>,
      counters as unknown as Model<CounterRecord>,
    );
  });

  it('finds and maps a product by pid', async () => {
    products.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(productRecord()),
    });

    const result = await repository.findByPid(1);

    expect(products.findOne).toHaveBeenCalledWith({
      pid: 1,
    });
    expect(result).toMatchObject({
      pid: 1,
      pname: 'Keyboard',
      price: '99.90',
      quantity: 10,
      isActive: true,
    });
  });

  it('creates a product with an atomic pid', async () => {
    counters.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'product_pid',
        sequence: 7,
      }),
    });

    products.create.mockResolvedValue(
      productRecord({
        pid: 7,
      }),
    );

    const product = ProductEntity.createNew('Keyboard', '99.90', 10);

    const result = await repository.create(product);

    expect(result.pid).toBe(7);

    const createData = products.create.mock.calls[0][0];

    expect(createData.pid).toBe(7);
    expect(createData.price.toString()).toBe('99.90');
  });

  it('lists active products with pagination', async () => {
    const execProducts = jest.fn().mockResolvedValue([productRecord()]);
    const limit = jest.fn().mockReturnValue({
      exec: execProducts,
    });
    const skip = jest.fn().mockReturnValue({
      limit,
    });
    const sort = jest.fn().mockReturnValue({
      skip,
    });

    products.find.mockReturnValue({ sort });
    products.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const result = await repository.list({
      page: 2,
      pageSize: 5,
      search: 'key',
    });

    expect(products.find).toHaveBeenCalledWith({
      isActive: true,
      pname: {
        $regex: 'key',
        $options: 'i',
      },
    });
    expect(skip).toHaveBeenCalledWith(5);
    expect(limit).toHaveBeenCalledWith(5);
    expect(result.total).toBe(1);
    expect(result.page).toBe(2);
  });

  it('updates an existing product', async () => {
    products.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(
        productRecord({
          pname: 'Updated Keyboard',
        }),
      ),
    });

    const product = ProductEntity.restore({
      pid: 1,
      pname: 'Updated Keyboard',
      price: '99.90',
      quantity: 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const result = await repository.update(product);

    expect(result.pname).toBe('Updated Keyboard');
    expect(products.findOneAndUpdate).toHaveBeenCalled();
  });
});
