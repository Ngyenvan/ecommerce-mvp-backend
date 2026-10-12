import { OrderAggregate } from '../../../domain/order/order.aggregate';

export interface OrderDetailResult {
  pid: number;
  pname: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
}

export interface OrderResult {
  oid: number;
  uid: number;
  items: OrderDetailResult[];
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResult {
  orders: OrderResult[];
  total: number;
  page: number;
  pageSize: number;
}

export function toOrderResult(order: OrderAggregate): OrderResult {
  if (order.oid === undefined) {
    throw new Error('Order has not been persisted');
  }

  return {
    oid: order.oid,
    uid: order.uid,
    items: order.items.map((item) => ({
      pid: item.pid,
      pname: item.pname,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    discountPercent: order.discountPercent,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
