import { CustomerEntity } from '../../domain/customer/customer.entity';
import { MembershipTierEntity } from '../../domain/customer/membership-tier.entity';
import { PrismaCustomerRepository } from './prisma-customer.repository';
import { PrismaService } from './prisma.service';

describe('PrismaCustomerRepository', () => {
  const bronze = MembershipTierEntity.restore({
    mid: 1,
    name: 'BRONZE',
    minScore: 0,
    discountPercent: 0,
  });

  const silver = MembershipTierEntity.restore({
    mid: 2,
    name: 'SILVER',
    minScore: 1000,
    discountPercent: 5,
  });

  const now = new Date('2026-10-09T10:00:00.000Z');

  const customerRecord = {
    uid: 10,
    fullName: 'Nguyen Van A',
    email: 'customer@example.com',
    phone: '0901234567',
    score: 0,
    createdAt: now,
    updatedAt: now,
    membership: {
      mid: 1,
      name: 'BRONZE',
      minScore: 0,
      discountPercent: {
        toString: () => '0.00',
      },
    },
  };

  const transaction = {
    customer: {
      update: jest.fn(),
    },
    scoreAdjustment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const prisma = {
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    scoreAdjustment: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let repository: PrismaCustomerRepository;

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<boolean>) =>
        callback(transaction),
    );

    repository = new PrismaCustomerRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('finds and maps a customer by uid', async () => {
    prisma.customer.findUnique.mockResolvedValue(customerRecord);

    const customer = await repository.findByUid(10);

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: {
        uid: 10,
      },
      include: {
        membership: true,
      },
    });
    expect(customer?.uid).toBe(10);
    expect(customer?.membership.name).toBe('BRONZE');
  });

  it('normalizes email before searching', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await repository.findByEmail('  CUSTOMER@EXAMPLE.COM ');

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'customer@example.com',
      },
      include: {
        membership: true,
      },
    });
  });

  it('normalizes phone before searching', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await repository.findByPhone('090 123 4567');

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: {
        phone: '0901234567',
      },
      include: {
        membership: true,
      },
    });
  });

  it('creates a customer connected to its membership', async () => {
    prisma.customer.create.mockResolvedValue(customerRecord);

    const customer = CustomerEntity.createNew(
      {
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      },
      [bronze],
    );

    const created = await repository.create(customer);

    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: {
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
        score: 0,
        membership: {
          connect: {
            mid: 1,
          },
        },
      },
      include: {
        membership: true,
      },
    });
    expect(created.uid).toBe(10);
  });

  it('saves a new score adjustment transactionally', async () => {
    transaction.scoreAdjustment.findUnique.mockResolvedValue(null);

    const customer = CustomerEntity.restore({
      uid: 10,
      fullName: 'Nguyen Van A',
      email: 'customer@example.com',
      phone: '0901234567',
      score: 0,
      membership: bronze,
      createdAt: now,
      updatedAt: now,
    });

    customer.adjustScore(1000, [bronze, silver], now);

    const applied = await repository.saveScoreAdjustment({
      customer,
      scoreDelta: 1000,
      reason: ' Order completed ',
      referenceId: ' order-1001 ',
    });

    expect(applied).toBe(true);
    expect(transaction.customer.update).toHaveBeenCalledWith({
      where: {
        uid: 10,
      },
      data: {
        score: 1000,
        membershipId: 2,
        updatedAt: now,
      },
    });
    expect(transaction.scoreAdjustment.create).toHaveBeenCalledWith({
      data: {
        uid: 10,
        scoreDelta: 1000,
        reason: 'Order completed',
        referenceId: 'order-1001',
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('does not apply the same reference twice', async () => {
    transaction.scoreAdjustment.findUnique.mockResolvedValue({
      id: 1,
    });

    const customer = CustomerEntity.restore({
      uid: 10,
      fullName: 'Nguyen Van A',
      email: 'customer@example.com',
      phone: '0901234567',
      score: 1000,
      membership: silver,
      createdAt: now,
      updatedAt: now,
    });

    const applied = await repository.saveScoreAdjustment({
      customer,
      scoreDelta: 1000,
      reason: 'Order completed',
      referenceId: 'order-1001',
    });

    expect(applied).toBe(false);
    expect(transaction.customer.update).not.toHaveBeenCalled();
    expect(transaction.scoreAdjustment.create).not.toHaveBeenCalled();
  });

  it('rejects an empty adjustment reason', async () => {
    const customer = CustomerEntity.restore({
      uid: 10,
      fullName: 'Nguyen Van A',
      email: 'customer@example.com',
      phone: '0901234567',
      score: 0,
      membership: bronze,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      repository.saveScoreAdjustment({
        customer,
        scoreDelta: 100,
        reason: ' ',
        referenceId: 'order-1001',
      }),
    ).rejects.toThrow(
      'Score adjustment reason must contain between 1 and 255 characters',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a customer with an unpersisted membership', async () => {
    const unpersistedMembership = MembershipTierEntity.createNew(
      'BRONZE',
      0,
      0,
    );

    const customer = CustomerEntity.createNew(
      {
        uid: 10,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        phone: '0901234567',
      },
      [unpersistedMembership],
    );

    await expect(repository.create(customer)).rejects.toThrow(
      'Cannot create a customer without a persisted membership',
    );
  });
  it('detects an already processed score adjustment', async () => {
    prisma.scoreAdjustment.findUnique.mockResolvedValue({
      id: 1,
    });

    const processed = await repository.hasScoreAdjustment(10, ' order-1001 ');

    expect(processed).toBe(true);
    expect(prisma.scoreAdjustment.findUnique).toHaveBeenCalledWith({
      where: {
        uid_referenceId: {
          uid: 10,
          referenceId: 'order-1001',
        },
      },
    });
  });
});
