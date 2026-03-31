import { EventEmitter } from "node:events";

export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  orderId?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

export type OrderEventType =
  | "order.created"
  | "order.confirmed"
  | "order.in_delivery"
  | "order.delivered"
  | "order.cancelled"
  | "order.failed_payment";

export interface OrderEvent extends DomainEvent {
  eventType: OrderEventType;
  orderId: string;
  userId: string;
  meta: {
    status: string;
    telegramId?: number;
    total?: number;
  };
}

class DomainEventBus extends EventEmitter {
  publish(event: DomainEvent) {
    this.emit(event.eventType, event);
    this.emit("*", event);
  }

  publishOrderEvent(params: {
    orderId: string;
    userId: string;
    status: string;
    telegramId?: number;
    total?: number;
  }) {
    const event: OrderEvent = {
      eventId: crypto.randomUUID(),
      eventType: `order.${params.status}` as OrderEventType,
      occurredAt: new Date().toISOString(),
      orderId: params.orderId,
      userId: params.userId,
      meta: {
        status: params.status,
        telegramId: params.telegramId,
        total: params.total,
      },
    };
    this.publish(event);
    return event;
  }
}

export const eventBus = new DomainEventBus();
