import { CustomerEntity } from '../../../domain/customer/customer.entity';
import { MembershipResult, toCustomerResult } from './customer-result';

export interface CustomerMembershipResult {
  uid: number;
  score: number;
  membership: MembershipResult;
}

export function toCustomerMembershipResult(
  customer: CustomerEntity,
): CustomerMembershipResult {
  const result = toCustomerResult(customer);

  return {
    uid: result.uid,
    score: result.score,
    membership: result.membership,
  };
}
