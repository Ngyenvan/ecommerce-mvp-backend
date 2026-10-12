import { Money } from './money.value-object';
import { InvalidOrderError } from './order.errors';

export interface CreateOrderDetailProps {
  pid: number;
  pname: string;
  qty: number;
  unitPrice: string;
}

export class OrderDetailEntity {
  private readonly productName: string;
  private readonly price: Money;
  private readonly total: Money;

  private constructor(
    readonly pid: number,
    pname: string,
    readonly qty: number,
    unitPrice: Money,
  ) {
    this.productName = pname;
    this.price = unitPrice;
    this.total = unitPrice.multiply(qty);
  }

  static create(props: CreateOrderDetailProps): OrderDetailEntity {
    if (!Number.isInteger(props.pid) || props.pid <= 0) {
      throw new InvalidOrderError('Product id must be a positive integer');
    }

    if (!Number.isInteger(props.qty) || props.qty <= 0) {
      throw new InvalidOrderError('Order quantity must be a positive integer');
    }

    const pname = props.pname.trim().replace(/\s+/g, ' ');

    if (pname.length === 0 || pname.length > 100) {
      throw new InvalidOrderError(
        'Product name must contain between 1 and 100 characters',
      );
    }

    const unitPrice = Money.from(props.unitPrice);

    if (unitPrice.isZero()) {
      throw new InvalidOrderError('Unit price must be greater than zero');
    }

    return new OrderDetailEntity(props.pid, pname, props.qty, unitPrice);
  }

  get pname(): string {
    return this.productName;
  }

  get unitPrice(): string {
    return this.price.toString();
  }

  get lineTotal(): string {
    return this.total.toString();
  }

  get lineTotalMoney(): Money {
    return this.total;
  }
}
