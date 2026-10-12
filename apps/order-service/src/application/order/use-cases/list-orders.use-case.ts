import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../../../domain/order/order.repository';
import { OrderListResult, toOrderResult } from '../dto/order-result';
import {
  InvalidOrderRequestError,
  OrderAccessDeniedError,
} from '../errors/order-application.errors';

export interface ListOrdersQuery {
  requesterUid: number;
  requesterRole: string;
  page?: number;
  pageSize?: number;
  customerUid?: number;
}

@Injectable()
export class ListOrdersUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(query: ListOrdersQuery): Promise<OrderListResult> {
    if (!Number.isInteger(query.requesterUid) || query.requesterUid <= 0) {
      throw new InvalidOrderRequestError(
        'Requester uid must be a positive integer',
      );
    }

    const role = query.requesterRole.trim().toUpperCase();

    if (role !== 'ADMIN' && role !== 'CUSTOMER') {
      throw new OrderAccessDeniedError();
    }

    const requestedPage = query.page ?? 0;
    const requestedPageSize = query.pageSize ?? 0;

    if (!Number.isInteger(requestedPage) || requestedPage < 0) {
      throw new InvalidOrderRequestError('Page must be a non-negative integer');
    }

    if (
      !Number.isInteger(requestedPageSize) ||
      requestedPageSize < 0 ||
      requestedPageSize > 100
    ) {
      throw new InvalidOrderRequestError('Page size must be between 0 and 100');
    }

    if (
      query.customerUid !== undefined &&
      (!Number.isInteger(query.customerUid) || query.customerUid <= 0)
    ) {
      throw new InvalidOrderRequestError(
        'Customer uid must be a positive integer',
      );
    }

    const result = await this.orders.list({
      uid: role === 'ADMIN' ? query.customerUid : query.requesterUid,
      page: requestedPage === 0 ? 1 : requestedPage,
      pageSize: requestedPageSize === 0 ? 20 : requestedPageSize,
    });

    return {
      orders: result.orders.map(toOrderResult),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
