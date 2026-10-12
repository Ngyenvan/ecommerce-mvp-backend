import {
  InventoryReservationEntity,
  InventoryReservationStatus,
} from '../../domain/inventory/inventory-reservation.entity';
import { InvalidInventoryReservationTransitionError } from '../../domain/inventory/inventory-reservation.errors';
import { InventoryReservationRepository } from '../../domain/inventory/inventory-reservation.repository';
import { InvalidInventoryReservationRequestError } from './errors/inventory.errors';
import { ConfirmInventoryReservationUseCase } from './use-cases/confirm-inventory-reservation.use-case';
import { ReleaseInventoryReservationUseCase } from './use-cases/release-inventory-reservation.use-case';
import { ReserveInventoryUseCase } from './use-cases/reserve-inventory.use-case';

describe('Inventory reservation', () => {
  const reservations = {
    reserve: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const createReservation = () =>
    InventoryReservationEntity.createReserved('reservation-1', [
      {
        pid: 1,
        pname: 'Keyboard',
        unitPrice: '99.90',
        qty: 2,
      },
    ]);

  let reserveInventory: ReserveInventoryUseCase;
  let confirmReservation: ConfirmInventoryReservationUseCase;
  let releaseReservation: ReleaseInventoryReservationUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    reservations.save.mockImplementation(
      async (reservation: InventoryReservationEntity) => reservation,
    );

    reserveInventory = new ReserveInventoryUseCase(
      reservations as unknown as InventoryReservationRepository,
    );

    confirmReservation = new ConfirmInventoryReservationUseCase(
      reservations as unknown as InventoryReservationRepository,
    );

    releaseReservation = new ReleaseInventoryReservationUseCase(
      reservations as unknown as InventoryReservationRepository,
    );
  });

  it('creates a normalized RESERVED entity', () => {
    const reservation = createReservation();

    expect(reservation.reservationId).toBe('reservation-1');
    expect(reservation.status).toBe(InventoryReservationStatus.RESERVED);
    expect(reservation.products[0]).toEqual({
      pid: 1,
      pname: 'Keyboard',
      unitPrice: '99.90',
      qty: 2,
    });
  });

  it('confirms a reserved entity', () => {
    const reservation = createReservation();

    reservation.confirm();

    expect(reservation.status).toBe(InventoryReservationStatus.CONFIRMED);
  });

  it('rejects confirming a released entity', () => {
    const reservation = createReservation();

    reservation.release('Order cancelled');

    expect(() => reservation.confirm()).toThrow(
      InvalidInventoryReservationTransitionError,
    );
  });

  it('reserves validated inventory items', async () => {
    reservations.reserve.mockResolvedValue(createReservation());

    const result = await reserveInventory.execute({
      items: [
        {
          pid: 1,
          qty: 2,
        },
      ],
    });

    expect(result.status).toBe(InventoryReservationStatus.RESERVED);
    expect(result.products).toHaveLength(1);
  });

  it('rejects duplicated products', async () => {
    await expect(
      reserveInventory.execute({
        items: [
          {
            pid: 1,
            qty: 1,
          },
          {
            pid: 1,
            qty: 2,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidInventoryReservationRequestError);

    expect(reservations.reserve).not.toHaveBeenCalled();
  });

  it('does not save an already confirmed reservation', async () => {
    const reservation = createReservation();
    reservation.confirm();

    reservations.findById.mockResolvedValue(reservation);

    const result = await confirmReservation.execute('reservation-1');

    expect(result.status).toBe(InventoryReservationStatus.CONFIRMED);
    expect(reservations.save).not.toHaveBeenCalled();
  });

  it('releases a reserved reservation', async () => {
    reservations.findById.mockResolvedValue(createReservation());

    const result = await releaseReservation.execute({
      reservationId: 'reservation-1',
      reason: 'Order cancelled',
    });

    expect(result.status).toBe(InventoryReservationStatus.RELEASED);
    expect(reservations.save).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty release reason', async () => {
    await expect(
      releaseReservation.execute({
        reservationId: 'reservation-1',
        reason: ' ',
      }),
    ).rejects.toBeInstanceOf(InvalidInventoryReservationRequestError);

    expect(reservations.findById).not.toHaveBeenCalled();
  });
});
