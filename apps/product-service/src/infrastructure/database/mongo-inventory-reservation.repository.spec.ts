import { Model, Types } from 'mongoose';
import {
  InventoryReservationEntity,
  InventoryReservationStatus,
} from '../../domain/inventory/inventory-reservation.entity';
import { InsufficientInventoryError } from '../../domain/inventory/inventory-reservation.errors';
import { MongoInventoryReservationRepository } from './mongo-inventory-reservation.repository';
import { InventoryReservationDocument } from './schemas/inventory-reservation.schema';
import { ProductDocument } from './schemas/product.schema';

describe('MongoInventoryReservationRepository', () => {
  const products = {
    findOneAndUpdate: jest.fn(),
    bulkWrite: jest.fn(),
  };

  const reservations = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  let repository: MongoInventoryReservationRepository;

  const now = new Date('2026-10-12T10:00:00.000Z');

  function productRecord(pid = 1): ProductDocument {
    return {
      pid,
      pname: `Product ${pid}`,
      price: Types.Decimal128.fromString('99.90'),
      quantity: 8,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  function reservationRecord(
    overrides: Partial<InventoryReservationDocument> = {},
  ): InventoryReservationDocument {
    return {
      reservationId: 'reservation-1',
      status: InventoryReservationStatus.RESERVED,
      products: [
        {
          pid: 1,
          pname: 'Product 1',
          unitPrice: Types.Decimal128.fromString('99.90'),
          qty: 2,
        },
      ],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.resetAllMocks();

    products.bulkWrite.mockResolvedValue({});

    reservations.create.mockImplementation(
      async (data: Partial<InventoryReservationDocument>) =>
        reservationRecord({
          ...data,
          createdAt: now,
          updatedAt: now,
        }),
    );

    repository = new MongoInventoryReservationRepository(
      products as unknown as Model<ProductDocument>,
      reservations as unknown as Model<InventoryReservationDocument>,
    );
  });

  it('atomically reserves available inventory', async () => {
    products.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(productRecord()),
    });

    const result = await repository.reserve([
      {
        pid: 1,
        qty: 2,
      },
    ]);

    expect(result.status).toBe(InventoryReservationStatus.RESERVED);
    expect(result.products[0]).toMatchObject({
      pid: 1,
      unitPrice: '99.90',
      qty: 2,
    });
  });

  it('restores earlier products when a later product fails', async () => {
    products.findOneAndUpdate
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(productRecord(1)),
      })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

    await expect(
      repository.reserve([
        {
          pid: 1,
          qty: 2,
        },
        {
          pid: 2,
          qty: 5,
        },
      ]),
    ).rejects.toBeInstanceOf(InsufficientInventoryError);

    expect(products.bulkWrite).toHaveBeenCalledTimes(1);
    expect(reservations.create).not.toHaveBeenCalled();
  });

  it('finds and maps a reservation', async () => {
    reservations.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(reservationRecord()),
    });

    const result = await repository.findById('reservation-1');

    expect(result?.reservationId).toBe('reservation-1');
    expect(result?.products[0].unitPrice).toBe('99.90');
  });

  it('restores stock when releasing a reservation', async () => {
    const reservation = InventoryReservationEntity.createReserved(
      'reservation-1',
      [
        {
          pid: 1,
          pname: 'Product 1',
          unitPrice: '99.90',
          qty: 2,
        },
      ],
    );

    reservation.release('Order cancelled');

    reservations.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(
        reservationRecord({
          status: InventoryReservationStatus.RELEASED,
          releaseReason: 'Order cancelled',
        }),
      ),
    });

    const result = await repository.save(reservation);

    expect(result.status).toBe(InventoryReservationStatus.RELEASED);
    expect(products.bulkWrite).toHaveBeenCalledTimes(1);
  });
});
