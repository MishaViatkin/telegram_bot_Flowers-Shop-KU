export type PaymentMethod = "card_online" | "cash" | "transfer";

export type PaymentStatus =
  | "pending"
  | "awaiting_confirmation"
  | "confirmed"
  | "failed"
  | "refunded";

export type PaymentProvider = "yookassa";

/**
 * Provider-side statuses as returned by YooKassa API.
 * Kept separately from app-level `PaymentStatus`.
 */
export const YOOKASSA_PAYMENT_STATUSES = [
  "pending",
  "waiting_for_capture",
  "succeeded",
  "canceled",
  "cancelled",
] as const;

export type YooKassaPaymentStatus = (typeof YOOKASSA_PAYMENT_STATUSES)[number];

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}
