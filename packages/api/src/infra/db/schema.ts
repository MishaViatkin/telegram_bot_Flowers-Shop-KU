import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    price: real("price").notNull(),
    originalPrice: real("original_price"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    composition: text("composition"),
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_active_idx").on(t.active),
  ],
);

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    telegramId: integer("telegram_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    username: text("username"),
    phone: text("phone"),
    referralCode: text("referral_code").notNull().unique(),
    referredBy: text("referred_by"),
    firstOrderPromoIssued: boolean("first_order_promo_issued").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_telegram_id_idx").on(t.telegramId)],
);

export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    items: jsonb("items")
      .$type<
        Array<{
          productId: string;
          title: string;
          price: number;
          image: string;
          quantity: number;
        }>
      >()
      .notNull()
      .default([]),
    promoCode: text("promo_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("carts_user_id_idx").on(t.userId)],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("draft"),
    items: jsonb("items")
      .$type<
        Array<{
          productId: string;
          title: string;
          price: number;
          image: string;
          quantity: number;
        }>
      >()
      .notNull(),
    recipient: jsonb("recipient").$type<{ name: string; phone: string }>().notNull(),
    address: jsonb("address")
      .$type<{
        street: string;
        building: string;
        apartment?: string;
        entrance?: string;
        floor?: string;
        comment?: string;
      }>()
      .notNull(),
    deliverySlot: jsonb("delivery_slot").$type<{ date: string; window: string }>().notNull(),
    paymentMethod: text("payment_method").notNull(),
    subtotal: real("subtotal").notNull(),
    discount: real("discount").notNull().default(0),
    deliveryFee: real("delivery_fee").notNull().default(0),
    total: real("total").notNull(),
    promoCode: text("promo_code"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_user_id_idx").on(t.userId), index("orders_status_idx").on(t.status)],
);

export const orderTimeline = pgTable(
  "order_timeline",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    status: text("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_timeline_order_idx").on(t.orderId)],
);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    type: text("type").notNull(),
    value: real("value").notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    minOrderAmount: real("min_order_amount"),
    maxUses: integer("max_uses").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    userId: text("user_id"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("promo_codes_code_idx").on(t.code)],
);

export const referrals = pgTable(
  "referrals",
  {
    id: text("id").primaryKey(),
    referrerId: text("referrer_id")
      .notNull()
      .references(() => users.id),
    referredUserId: text("referred_user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("pending"),
    rewardAmount: real("reward_amount").notNull().default(200),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("referrals_referrer_idx").on(t.referrerId)],
);

/** Платежи внешнего провайдера (YooKassa и др.) */
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    provider: text("provider").notNull().default("yookassa"),
    externalId: text("external_id").notNull().unique(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("RUB"),
    status: text("status").notNull(),
    confirmationUrl: text("confirmation_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status)],
);

/** Идемпотентность обработки webhook (provider + уникальный ключ события) */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_events_provider_idx").on(t.provider)],
);
