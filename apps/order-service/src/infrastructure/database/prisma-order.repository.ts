import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  OrderAggregate,
  OrderStatus,
} from '../../domain/order/order.aggregate';
import {
  ListOrdersQuery,
  OrderPage,
  OrderRepository,
} from '../../domain/order/order.repository';
import { PrismaService } from './prisma.service';

type OrderRecord = Prisma.OrderGetPayload<{
  include: { details: true };
}>;

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOid(oid: number): Promise<OrderAggregate | null> {
    const record = await this.prisma.order.findUnique({
      where: { oid },
      include: { details: true },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByClientRequestId(
    clientRequestId: string,
  ): Promise<OrderAggregate | null> {
    const record = await this.prisma.order.findUnique({
      where: { clientRequestId },
      include: { details: true },
    });

    return record ? this.toDomain(record) : null;
  }

  async list(query: ListOrdersQuery): Promise<OrderPage> {
    const where = query.uid === undefined ? {} : { uid: query.uid };
    const skip = (query.page - 1) * query.pageSize;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { details: true },
        orderBy: [{ createdAt: 'desc' }, { oid: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: records.map((record) => this.toDomain(record)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async createWithOutbox(order: OrderAggregate): Promise<OrderAggregate> {
    const eventId = randomUUID();

    const createdOrder = await this.prisma.$transaction(async (transaction) => {
      const savedOrder = await transaction.order.create({
        data: {
          uid: order.uid,
          clientRequestId: order.clientRequestId,
          inventoryReservationId: order.inventoryReservationId,
          subtotal: order.subtotal,
          discountPercent: order.discountPercent,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
          status: 'CREATED',
          details: {
            create: order.items.map((item) => ({
              pid: item.pid,
              pname: item.pname,
              qty: item.qty,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { details: true },
      });

      await transaction.outboxEvent.create({
        data: {
          eventId,
          aggregateId: savedOrder.oid,
          eventType: 'order.created',
          status: 'AWAITING_CONFIRMATION',
          payload: {
            event_id: eventId,
            event_type: 'order.created',
            event_version: 1,
            occurred_at: savedOrder.createdAt.toISOString(),
            correlation_id: order.clientRequestId,
            data: {
              oid: savedOrder.oid,
              uid: savedOrder.uid,
              subtotal: savedOrder.subtotal.toFixed(2),
              discount_amount: savedOrder.discountAmount.toFixed(2),
              total_amount: savedOrder.totalAmount.toFixed(2),
              items: savedOrder.details.map((item) => ({
                pid: item.pid,
                pname: item.pname,
                qty: item.qty,
                unit_price: item.unitPrice.toFixed(2),
                line_total: item.lineTotal.toFixed(2),
              })),
            },
          },
        },
      });

      return savedOrder;
    });

    return this.toDomain(createdOrder);
  }

  async markReadyForPublishing(oid: number): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: {
        aggregateId: oid,
        eventType: 'order.created',
        status: 'AWAITING_CONFIRMATION',
      },
      data: {
        status: 'PENDING',
        nextAttemptAt: new Date(),
      },
    });
  }

  private toDomain(record: OrderRecord): OrderAggregate {
    return OrderAggregate.restore({
      oid: record.oid,
      uid: record.uid,
      clientRequestId: record.clientRequestId,
      inventoryReservationId: record.inventoryReservationId,
      discountPercent: record.discountPercent.toFixed(2),
      status:
        record.status === 'CREATED'
          ? OrderStatus.CREATED
          : OrderStatus.CANCELLED,
      items: record.details.map((item) => ({
        pid: item.pid,
        pname: item.pname,
        qty: item.qty,
        unitPrice: item.unitPrice.toFixed(2),
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
