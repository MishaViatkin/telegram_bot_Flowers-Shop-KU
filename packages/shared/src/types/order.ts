import type { CartItem } from "./cart.js";
import type { DeliverySlot } from "./delivery.js";
import type { PaymentMethod } from "./payment.js";

export type OrderStatus =
  | "draft"
  | "created"
  | "confirmed"
  | "in_delivery"
  | "delivered"
  | "cancelled"
  | "failed_payment";

export interface OrderRecipient {
  name: string;
  phone: string;
}

export interface OrderAddress {
  street: string;
  building: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  comment?: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  items: CartItem[];
  recipient: OrderRecipient;
  address: OrderAddress;
  deliverySlot: DeliverySlot;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  promoCode?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}
