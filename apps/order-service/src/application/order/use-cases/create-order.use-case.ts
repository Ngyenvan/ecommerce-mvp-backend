import { Injectable } from '@nestjs/common';
import { OrderAggregate } from '../../../domain/order/order.aggregate';
import { OrderRepository } from '../../../domain/order/order.repository';
import { OrderResult, toOrderResult } from '../dto/order-result';
import {
  InventoryConfirmationPendingError,
  InvalidOrderRequestError,
  OrderRequestConflictError,
} from '../errors/order-application.errors';
import { CustomerMembershipGateway } from '../ports/customer-membership.gateway';
import {
  InventoryGateway,
  InventoryRequestItem,
} from '../ports/inventory.gateway';

export interface CreateOrderCommand {
  uid: number;
  items: InventoryRequestItem[];
  clientRequestId: string;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerMembershipGateway,
    private readonly inventory: InventoryGateway,
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderResult> {
    const normalizedCommand = this.validate(command);
    const existingOrder = await this.orders.findByClientRequestId(
      normalizedCommand.clientRequestId,
    );

    if (existingOrder) {
      if (existingOrder.uid !== normalizedCommand.uid) {
        throw new OrderRequestConflictError();
      }

      await this.confirmInventory(existingOrder);

      return toOrderResult(existingOrder);
    }

    const membership = await this.customers.getMembership(
      normalizedCommand.uid,
    );
    const reservation = await this.inventory.reserve(normalizedCommand.items);

    let savedOrder: OrderAggregate;

    try {
      const order = OrderAggregate.create({
        uid: normalizedCommand.uid,
        clientRequestId: normalizedCommand.clientRequestId,
        inventoryReservationId: reservation.reservationId,
        membershipScore: membership.score,
        discountPercent: membership.discountPercent,
        items: reservation.products.map((product) => ({
          pid: product.pid,
          pname: product.pname,
          qty: product.qty,
          unitPrice: product.unitPrice,
        })),
      });

      savedOrder = await this.orders.createWithOutbox(order);
    } catch (error: unknown) {
      await this.releaseInventorySafely(
        reservation.reservationId,
        'Order persistence failed',
      );
      throw error;
    }

    await this.confirmInventory(savedOrder);

    return toOrderResult(savedOrder);
  }

  private validate(command: CreateOrderCommand): CreateOrderCommand {
    if (!Number.isInteger(command.uid) || command.uid <= 0) {
      throw new InvalidOrderRequestError(
        'Customer uid must be a positive integer',
      );
    }

    const clientRequestId = command.clientRequestId.trim();

    if (clientRequestId.length === 0 || clientRequestId.length > 100) {
      throw new InvalidOrderRequestError(
        'Client request id must contain between 1 and 100 characters',
      );
    }

    if (
      !Array.isArray(command.items) ||
      command.items.length === 0 ||
      command.items.length > 100
    ) {
      throw new InvalidOrderRequestError(
        'Order must contain between 1 and 100 items',
      );
    }

    const productIds = new Set<number>();

    for (const item of command.items) {
      if (
        !Number.isInteger(item.pid) ||
        item.pid <= 0 ||
        !Number.isInteger(item.qty) ||
        item.qty <= 0
      ) {
        throw new InvalidOrderRequestError(
          'Product id and quantity must be positive integers',
        );
      }

      if (productIds.has(item.pid)) {
        throw new InvalidOrderRequestError(
          `Product ${item.pid} appears more than once`,
        );
      }

      productIds.add(item.pid);
    }

    return {
      uid: command.uid,
      clientRequestId,
      items: command.items.map((item) => ({ ...item })),
    };
  }

  private async confirmInventory(order: OrderAggregate): Promise<void> {
    try {
      await this.inventory.confirm(order.inventoryReservationId);
      if (order.oid === undefined) {
        throw new Error('Persisted order id is missing');
      }

      await this.orders.markReadyForPublishing(order.oid);
    } catch {
      if (order.oid === undefined) {
        throw new Error('Persisted order id is missing');
      }

      throw new InventoryConfirmationPendingError(order.oid);
    }
  }

  private async releaseInventorySafely(
    reservationId: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.inventory.release(reservationId, reason);
    } catch {
      return;
    }
  }
}
