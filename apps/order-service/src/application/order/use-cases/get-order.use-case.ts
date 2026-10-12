import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../../../domain/order/order.repository';
import { OrderResult, toOrderResult } from '../dto/order-result';
import {
  InvalidOrderRequestError,
  OrderAccessDeniedError,
  OrderNotFoundError,
} from '../errors/order-application.errors';

export interface GetOrderQuery {
  oid: number;
  requesterUid: number;
  requesterRole: string;
}

@Injectable()
export class GetOrderUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(query: GetOrderQuery): Promise<OrderResult> {
    if (
      !Number.isInteger(query.oid) ||
      query.oid <= 0 ||
      !Number.isInteger(query.requesterUid) ||
      query.requesterUid <= 0
    ) {
      throw new InvalidOrderRequestError(
        'Order id and requester uid must be positive integers',
      );
    }

    const role = query.requesterRole.trim().toUpperCase();

    if (role !== 'ADMIN' && role !== 'CUSTOMER') {
      throw new OrderAccessDeniedError();
    }

    const order = await this.orders.findByOid(query.oid);

    if (!order) {
      throw new OrderNotFoundError(query.oid);
    }

    if (role !== 'ADMIN' && order.uid !== query.requesterUid) {
      throw new OrderAccessDeniedError();
    }

    return toOrderResult(order);
  }
}
