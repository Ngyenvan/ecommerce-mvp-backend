import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { MembershipTierEntity } from '../../../domain/customer/membership-tier.entity';

export interface MembershipResult {
  mid: number;
  name: string;
  minScore: number;
  discountPercent: string;
}

export interface CustomerResult {
  uid: number;
  fullName: string;
  email: string;
  phone: string;
  score: number;
  membership: MembershipResult;
  createdAt: string;
  updatedAt: string;
}

export function toMembershipResult(
  membership: MembershipTierEntity,
): MembershipResult {
  const membershipId = membership.mid;

  if (membershipId === undefined) {
    throw new Error('Membership tier has not been persisted');
  }

  return {
    mid: membershipId,
    name: membership.name,
    minScore: membership.minScore,
    discountPercent: membership.discountPercent.toFixed(2),
  };
}

export function toCustomerResult(customer: CustomerEntity): CustomerResult {
  return {
    uid: customer.uid,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    score: customer.score,
    membership: toMembershipResult(customer.membership),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}
