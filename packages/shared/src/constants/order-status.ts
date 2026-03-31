import type { OrderStatus } from "../types/order.js";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Черновик",
  created: "Создан",
  confirmed: "Подтверждён",
  in_delivery: "В доставке",
  delivered: "Доставлен",
  cancelled: "Отменён",
  failed_payment: "Ошибка оплаты",
};

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  draft: ["created", "cancelled"],
  created: ["confirmed", "cancelled", "failed_payment"],
  confirmed: ["in_delivery", "cancelled"],
  in_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
  failed_payment: ["created", "cancelled"],
};
