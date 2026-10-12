import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import { MembershipAlreadyExistsError } from '../errors/membership.errors';
import { CreateMembershipTierUseCase } from './create-membership-tier.use-case';

describe('CreateMembershipTierUseCase', () => {
  const memberships = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  let useCase: CreateMembershipTierUseCase;

  beforeEach(() => {
    jest.resetAllMocks();

    memberships.findAll.mockResolvedValue([]);
    memberships.findByName.mockResolvedValue(null);

    memberships.create.mockImplementation(
      async (membership: MembershipTierEntity) =>
        MembershipTierEntity.restore({
          mid: 4,
          name: membership.name,
          minScore: membership.minScore,
          discountPercent: membership.discountPercent,
        }),
    );

    useCase = new CreateMembershipTierUseCase(
      memberships as unknown as MembershipRepository,
    );
  });

  it('creates a normalized membership tier', async () => {
    const result = await useCase.execute({
      name: ' platinum ',
      minScore: 10000,
      discountPercent: 15,
    });

    expect(result).toEqual({
      mid: 4,
      name: 'PLATINUM',
      minScore: 10000,
      discountPercent: '15.00',
    });

    expect(memberships.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicated membership name', async () => {
    memberships.findByName.mockResolvedValue(
      MembershipTierEntity.restore({
        mid: 4,
        name: 'PLATINUM',
        minScore: 10000,
        discountPercent: 15,
      }),
    );

    await expect(
      useCase.execute({
        name: 'platinum',
        minScore: 20000,
        discountPercent: 20,
      }),
    ).rejects.toMatchObject({
      code: 'MEMBERSHIP_ALREADY_EXISTS',
      field: 'name',
    });

    expect(memberships.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicated minimum score', async () => {
    memberships.findAll.mockResolvedValue([
      MembershipTierEntity.restore({
        mid: 4,
        name: 'PLATINUM',
        minScore: 10000,
        discountPercent: 15,
      }),
    ]);

    await expect(
      useCase.execute({
        name: 'DIAMOND',
        minScore: 10000,
        discountPercent: 20,
      }),
    ).rejects.toBeInstanceOf(MembershipAlreadyExistsError);

    expect(memberships.create).not.toHaveBeenCalled();
  });
});
