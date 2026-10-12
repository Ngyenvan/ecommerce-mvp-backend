import { MembershipRepository } from '../../../domain/customer/membership.repository';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';
import {
  InvalidMembershipUpdateError,
  MembershipAlreadyExistsError,
  MembershipNotFoundError,
} from '../errors/membership.errors';
import { UpdateMembershipTierUseCase } from './update-membership-tier.use-case';

describe('UpdateMembershipTierUseCase', () => {
  const memberships = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  let useCase: UpdateMembershipTierUseCase;

  const silver = () =>
    MembershipTierEntity.restore({
      mid: 2,
      name: 'SILVER',
      minScore: 1000,
      discountPercent: 5,
    });

  beforeEach(() => {
    jest.resetAllMocks();

    memberships.findById.mockResolvedValue(silver());
    memberships.findByName.mockResolvedValue(null);
    memberships.findAll.mockResolvedValue([silver()]);
    memberships.update.mockImplementation(
      async (membership: MembershipTierEntity) => membership,
    );

    useCase = new UpdateMembershipTierUseCase(
      memberships as unknown as MembershipRepository,
    );
  });

  it('updates and normalizes a membership tier', async () => {
    const result = await useCase.execute({
      mid: 2,
      name: ' premium silver ',
      minScore: 1500,
      discountPercent: 7.5,
    });

    expect(result).toEqual({
      mid: 2,
      name: 'PREMIUM SILVER',
      minScore: 1500,
      discountPercent: '7.50',
    });

    expect(memberships.update).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing membership tier', async () => {
    memberships.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        mid: 99,
        name: 'UNKNOWN',
        minScore: 20000,
        discountPercent: 20,
      }),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);

    expect(memberships.update).not.toHaveBeenCalled();
  });

  it('rejects a name used by another tier', async () => {
    memberships.findByName.mockResolvedValue(
      MembershipTierEntity.restore({
        mid: 3,
        name: 'GOLD',
        minScore: 5000,
        discountPercent: 10,
      }),
    );

    await expect(
      useCase.execute({
        mid: 2,
        name: 'GOLD',
        minScore: 1500,
        discountPercent: 7.5,
      }),
    ).rejects.toBeInstanceOf(MembershipAlreadyExistsError);

    expect(memberships.update).not.toHaveBeenCalled();
  });

  it('rejects a score threshold used by another tier', async () => {
    memberships.findAll.mockResolvedValue([
      silver(),
      MembershipTierEntity.restore({
        mid: 3,
        name: 'GOLD',
        minScore: 5000,
        discountPercent: 10,
      }),
    ]);

    await expect(
      useCase.execute({
        mid: 2,
        name: 'SILVER PLUS',
        minScore: 5000,
        discountPercent: 7.5,
      }),
    ).rejects.toMatchObject({
      code: 'MEMBERSHIP_ALREADY_EXISTS',
      field: 'minScore',
    });

    expect(memberships.update).not.toHaveBeenCalled();
  });
  it('updates only the provided field', async () => {
    const result = await useCase.execute({
      mid: 2,
      discountPercent: 6.5,
    });

    expect(result).toEqual({
      mid: 2,
      name: 'SILVER',
      minScore: 1000,
      discountPercent: '6.50',
    });

    expect(memberships.update).toHaveBeenCalledTimes(1);
  });

  it('rejects an update without any fields', async () => {
    await expect(
      useCase.execute({
        mid: 2,
      }),
    ).rejects.toBeInstanceOf(InvalidMembershipUpdateError);

    expect(memberships.findById).not.toHaveBeenCalled();
    expect(memberships.update).not.toHaveBeenCalled();
  });
});
