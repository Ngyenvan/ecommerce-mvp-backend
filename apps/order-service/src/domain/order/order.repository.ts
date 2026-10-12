import { OrderAggregate } from './order.aggregate';

export interface ListOrdersQuery {
  uid?: number;
  page: number;
  pageSize: number;
}

export interface OrderPage {
  orders: OrderAggregate[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class OrderRepository {
  abstract findByOid(oid: number): Promise<OrderAggregate | null>;

  abstract findByClientRequestId(
    clientRequestId: string,
  ): Promise<OrderAggregate | null>;

  abstract list(query: ListOrdersQuery): Promise<OrderPage>;

  abstract createWithOutbox(order: OrderAggregate): Promise<OrderAggregate>;

  abstract markReadyForPublishing(oid: number): Promise<void>;
}
