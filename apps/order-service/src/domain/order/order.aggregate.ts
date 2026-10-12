import { MembershipDiscountPolicy } from './membership-discount.policy';
import { Money } from './money.value-object';
import {
  CreateOrderDetailProps,
  OrderDetailEntity,
} from './order-detail.entity';
import { InvalidOrderError } from './order.errors';

export enum OrderStatus {
  CREATED = 'ORDER_STATUS_CREATED',
  CANCELLED = 'ORDER_STATUS_CANCELLED',
}

export interface CreateOrderProps {
  uid: number;
  clientRequestId: string;
  inventoryReservationId: string;
  membershipScore: number;
  discountPercent: string;
  items: CreateOrderDetailProps[];
}

export interface RestoreOrderProps {
  oid: number;
  uid: number;
  clientRequestId: string;
  inventoryReservationId: string;
  discountPercent: string;
  items: CreateOrderDetailProps[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class OrderAggregate {
  private constructor(
    private readonly orderId: number | undefined,
    readonly uid: number,
    readonly clientRequestId: string,
    readonly inventoryReservationId: string,
    private readonly orderItems: OrderDetailEntity[],
    private readonly subtotalValue: Money,
    private readonly discountPercentValue: string,
    private readonly discountAmountValue: Money,
    private readonly totalAmountValue: Money,
    private orderStatus: OrderStatus,
    private readonly creationDate: Date,
    private modificationDate: Date,
  ) {}

  static create(props: CreateOrderProps): OrderAggregate {
    this.validateIdentity(
      props.uid,
      props.clientRequestId,
      props.inventoryReservationId,
    );
    const items = this.createItems(props.items);
    const subtotal = this.calculateSubtotal(items);
    const discountPolicy = MembershipDiscountPolicy.from(
      props.membershipScore,
      props.discountPercent,
    );
    const discountAmount = discountPolicy.calculateDiscount(subtotal);
    const now = new Date();

    return new OrderAggregate(
      undefined,
      props.uid,
      props.clientRequestId.trim(),
      props.inventoryReservationId.trim(),
      items,
      subtotal,
      discountPolicy.discountPercent,
      discountAmount,
      subtotal.subtract(discountAmount),
      OrderStatus.CREATED,
      now,
      now,
    );
  }

  static restore(props: RestoreOrderProps): OrderAggregate {
    if (!Number.isInteger(props.oid) || props.oid <= 0) {
      throw new InvalidOrderError('Order id must be a positive integer');
    }

    this.validateIdentity(
      props.uid,
      props.clientRequestId,
      props.inventoryReservationId,
    );
    const items = this.createItems(props.items);
    const subtotal = this.calculateSubtotal(items);
    const discountPolicy = MembershipDiscountPolicy.from(
      0,
      props.discountPercent,
    );

    if (
      !(props.createdAt instanceof Date) ||
      Number.isNaN(props.createdAt.getTime()) ||
      !(props.updatedAt instanceof Date) ||
      Number.isNaN(props.updatedAt.getTime())
    ) {
      throw new InvalidOrderError('Order dates are invalid');
    }

    const discountAmount = discountPolicy.calculateDiscount(subtotal);

    return new OrderAggregate(
      props.oid,
      props.uid,
      props.clientRequestId.trim(),
      props.inventoryReservationId.trim(),
      items,
      subtotal,
      discountPolicy.discountPercent,
      discountAmount,
      subtotal.subtract(discountAmount),
      props.status,
      new Date(props.createdAt),
      new Date(props.updatedAt),
    );
  }

  cancel(): void {
    if (this.orderStatus === OrderStatus.CANCELLED) {
      return;
    }

    this.orderStatus = OrderStatus.CANCELLED;
    this.modificationDate = new Date();
  }

  private static validateIdentity(
    uid: number,
    clientRequestId: string,
    inventoryReservationId: string,
  ): void {
    if (!Number.isInteger(uid) || uid <= 0) {
      throw new InvalidOrderError('Customer uid must be a positive integer');
    }

    const normalizedRequestId = clientRequestId.trim();

    if (normalizedRequestId.length === 0 || normalizedRequestId.length > 100) {
      throw new InvalidOrderError(
        'Client request id must contain between 1 and 100 characters',
      );
    }

    const normalizedReservationId = inventoryReservationId.trim();

    if (
      normalizedReservationId.length === 0 ||
      normalizedReservationId.length > 100
    ) {
      throw new InvalidOrderError(
        'Inventory reservation id must contain between 1 and 100 characters',
      );
    }
  }

  private static createItems(
    itemProps: CreateOrderDetailProps[],
  ): OrderDetailEntity[] {
    if (!Array.isArray(itemProps) || itemProps.length === 0) {
      throw new InvalidOrderError('Order must contain at least one item');
    }

    if (itemProps.length > 100) {
      throw new InvalidOrderError('Order must not contain more than 100 items');
    }

    const seenProductIds = new Set<number>();

    return itemProps.map((item) => {
      if (seenProductIds.has(item.pid)) {
        throw new InvalidOrderError(
          `Product ${item.pid} appears more than once in the order`,
        );
      }

      seenProductIds.add(item.pid);

      return OrderDetailEntity.create(item);
    });
  }

  private static calculateSubtotal(items: OrderDetailEntity[]): Money {
    return items.reduce(
      (subtotal, item) => subtotal.add(item.lineTotalMoney),
      Money.zero(),
    );
  }

  get oid(): number | undefined {
    return this.orderId;
  }

  get items(): OrderDetailEntity[] {
    return [...this.orderItems];
  }

  get subtotal(): string {
    return this.subtotalValue.toString();
  }

  get discountPercent(): string {
    return this.discountPercentValue;
  }

  get discountAmount(): string {
    return this.discountAmountValue.toString();
  }

  get totalAmount(): string {
    return this.totalAmountValue.toString();
  }

  get status(): OrderStatus {
    return this.orderStatus;
  }

  get createdAt(): Date {
    return new Date(this.creationDate);
  }

  get updatedAt(): Date {
    return new Date(this.modificationDate);
  }
}
