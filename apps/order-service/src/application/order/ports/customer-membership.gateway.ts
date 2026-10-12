export interface CustomerMembershipSnapshot {
  uid: number;
  score: number;
  discountPercent: string;
}

export abstract class CustomerMembershipGateway {
  abstract getMembership(uid: number): Promise<CustomerMembershipSnapshot>;
}
