import { CustomerEntity } from './customer.entity';

export interface SaveScoreAdjustmentInput {
  customer: CustomerEntity;
  scoreDelta: number;
  reason: string;
  referenceId: string;
}

export abstract class CustomerRepository {
  abstract findByUid(uid: number): Promise<CustomerEntity | null>;

  abstract findByEmail(email: string): Promise<CustomerEntity | null>;

  abstract findByPhone(phone: string): Promise<CustomerEntity | null>;

  abstract create(customer: CustomerEntity): Promise<CustomerEntity>;

  abstract update(customer: CustomerEntity): Promise<CustomerEntity>;

  /**
   * Trả về false nếu referenceId đã được xử lý trước đó.
   * Điều này ngăn cùng một sự kiện cộng điểm hai lần.
   */
  abstract hasScoreAdjustment(
    uid: number,
    referenceId: string,
  ): Promise<boolean>;
  abstract saveScoreAdjustment(
    input: SaveScoreAdjustmentInput,
  ): Promise<boolean>;
}
