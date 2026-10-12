import { MembershipTierEntity } from '../../domain/customer/membership-tier.entity';
import { PrismaMembershipRepository } from './prisma-membership.repository';
import { PrismaService } from './prisma.service';

describe('PrismaMembershipRepository', () => {
  const membershipRecord = {
    mid: 2,
    name: 'SILVER',
    minScore: 1000,
    discountPercent: {
      toString: () => '5.00',
    },
  };

  const prisma = {
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  let repository: PrismaMembershipRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new PrismaMembershipRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('returns all membership tiers ordered by score', async () => {
    prisma.membership.findMany.mockResolvedValue([membershipRecord]);

    const memberships = await repository.findAll();

    expect(prisma.membership.findMany).toHaveBeenCalledWith({
      orderBy: {
        minScore: 'asc',
      },
    });
    expect(memberships[0].name).toBe('SILVER');
    expect(memberships[0].discountPercent).toBe(5);
  });

  it('normalizes a membership name before searching', async () => {
    prisma.membership.findUnique.mockResolvedValue(membershipRecord);

    const membership = await repository.findByName(' silver ');

    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: {
        name: 'SILVER',
      },
    });
    expect(membership?.mid).toBe(2);
  });

  it('creates a new membership tier', async () => {
    prisma.membership.create.mockResolvedValue({
      mid: 4,
      name: 'PLATINUM',
      minScore: 10000,
      discountPercent: {
        toString: () => '15.00',
      },
    });

    const membership = MembershipTierEntity.createNew('PLATINUM', 10000, 15);

    const created = await repository.create(membership);

    expect(created.mid).toBe(4);
    expect(created.name).toBe('PLATINUM');
    expect(created.discountPercent).toBe(15);
  });

  it('rejects creating a membership that already has an id', async () => {
    const membership = MembershipTierEntity.restore({
      mid: 2,
      name: 'SILVER',
      minScore: 1000,
      discountPercent: 5,
    });

    await expect(repository.create(membership)).rejects.toThrow(
      'Cannot create a membership that already has an id',
    );
  });
});
