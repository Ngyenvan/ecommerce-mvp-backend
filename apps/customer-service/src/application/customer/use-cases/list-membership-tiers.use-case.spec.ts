import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import { ListMembershipTiersUseCase } from './list-membership-tiers.use-case';

describe('ListMembershipTiersUseCase', () => {
  const memberships = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  let useCase: ListMembershipTiersUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    useCase = new ListMembershipTiersUseCase(
      memberships as unknown as MembershipRepository,
    );
  });

  it('returns all membership tiers', async () => {
    memberships.findAll.mockResolvedValue([
      MembershipTierEntity.restore({
        mid: 1,
        name: 'BRONZE',
        minScore: 0,
        discountPercent: 0,
      }),
      MembershipTierEntity.restore({
        mid: 2,
        name: 'SILVER',
        minScore: 1000,
        discountPercent: 5,
      }),
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        mid: 1,
        name: 'BRONZE',
        minScore: 0,
        discountPercent: '0.00',
      },
      {
        mid: 2,
        name: 'SILVER',
        minScore: 1000,
        discountPercent: '5.00',
      },
    ]);
  });

  it('returns an empty list when no tier exists', async () => {
    memberships.findAll.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
