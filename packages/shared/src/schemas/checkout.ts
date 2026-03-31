import { z } from "zod";

export const recipientSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+7\d{10}$/, "Формат: +7XXXXXXXXXX"),
});

export const addressSchema = z.object({
  street: z.string().min(2).max(200),
  building: z.string().min(1).max(20),
  apartment: z.string().max(10).optional(),
  entrance: z.string().max(10).optional(),
  floor: z.string().max(10).optional(),
  comment: z.string().max(500).optional(),
});

export const deliverySlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  window: z.enum(["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-21:00", "asap"]),
});

export const checkoutSchema = z.object({
  recipient: recipientSchema,
  address: addressSchema,
  deliverySlot: deliverySlotSchema,
  paymentMethod: z.enum(["card_online", "cash", "transfer"]),
  comment: z.string().max(500).optional(),
  promoCode: z.string().max(64).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
