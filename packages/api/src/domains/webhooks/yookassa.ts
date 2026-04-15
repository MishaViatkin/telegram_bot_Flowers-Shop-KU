import { randomUUID } from "node:crypto";
import type { OrderStatus } from "@flowers-tg/shared";
import { ORDER_STATUS_FLOW } from "@flowers-tg/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  orders,
  orderTimeline,
  payments,
  products,
  users,
  webhookEvents,
} from "../../infra/db/schema.js";
import { amountsMatchOrderTotal, getPayment } from "../../infra/yookassa/client.js";

interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

const notificationSchema = z.object({
  type: z.literal("notification"),
  event: z.string(),
  object: z.object({
    id: z.string(),
    status: z.string(),
    amount: z.object({ value: z.string(), currency: z.string() }),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

function isOrderStatus(value: string): value is OrderStatus {
  return Object.hasOwn(ORDER_STATUS_FLOW, value);
}

export async function yookassaWebhookRoutes(app: FastifyInstance) {
  app.post(
    "/webhooks/yookassa",
    {
      config: {
        rateLimit: {
          max: Number(process.env.YOOKASSA_WEBHOOK_RATE_LIMIT_MAX) || 60,
          timeWindow: Number(process.env.YOOKASSA_WEBHOOK_RATE_LIMIT_WINDOW_MS) || 60_000,
        },
      },
    },
    async (request, reply) => {
      const parsed = notificationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Некорректное уведомление" },
        });
      }

      const { event, object } = parsed.data;
      const dedupeKey = `yookassa:${event}:${object.id}`;

      const inserted = await app.db
        .insert(webhookEvents)
        .values({
          id: randomUUID(),
          provider: "yookassa",
          dedupeKey,
        })
        .onConflictDoNothing({ target: webhookEvents.dedupeKey })
        .returning({ id: webhookEvents.id });

      if (inserted.length === 0) {
        return { success: true, duplicate: true };
      }

      let verified: Awaited<ReturnType<typeof getPayment>>;
      try {
        verified = await getPayment(object.id);
      } catch (e) {
        app.log.warn({ err: e, paymentId: object.id }, "YooKassa webhook: getPayment failed");
        // Allow provider to retry if we couldn't verify right now.
        await app.db
          .delete(webhookEvents)
          .where(
            and(eq(webhookEvents.provider, "yookassa"), eq(webhookEvents.dedupeKey, dedupeKey)),
          );
        return reply.status(502).send({
          success: false,
          error: {
            code: "PROVIDER_ERROR",
            message: "Не удалось верифицировать платёж у провайдера",
          },
        });
      }

      const orderIdMeta = verified.metadata?.orderId;
      if (typeof orderIdMeta !== "string" || !orderIdMeta) {
        app.log.warn({ paymentId: object.id }, "YooKassa webhook: missing orderId in metadata");
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "В платеже отсутствует orderId" },
        });
      }

      const [order] = await app.db.select().from(orders).where(eq(orders.id, orderIdMeta)).limit(1);
      if (!order) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Заказ не найден" },
        });
      }

      if (order.paymentMethod !== "card_online") {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Заказ не для онлайн-оплаты" },
        });
      }

      if (!amountsMatchOrderTotal(order.total, verified.amount.value)) {
        app.log.error(
          { orderId: order.id, expected: order.total, got: verified.amount.value },
          "YooKassa webhook: amount mismatch",
        );
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Сумма платежа не совпадает с суммой заказа" },
        });
      }

      const now = new Date();

      await app.db
        .update(payments)
        .set({ status: verified.status, updatedAt: now })
        .where(eq(payments.externalId, verified.id));

      if (verified.status === "succeeded") {
        if (order.status !== "created" || !isOrderStatus(order.status)) {
          return { success: true, ignored: true };
        }
        const allowed = ORDER_STATUS_FLOW.created;
        if (!allowed.includes("confirmed")) {
          return { success: true, ignored: true };
        }

        let transitioned = false;
        await app.db.transaction(async (tx) => {
          const [row] = await tx
            .update(orders)
            .set({ status: "confirmed", updatedAt: now })
            .where(and(eq(orders.id, order.id), eq(orders.status, "created")))
            .returning();

          if (!row) return;

          await tx.insert(orderTimeline).values({
            id: randomUUID(),
            orderId: order.id,
            status: "confirmed",
            note: "Оплата получена",
            createdAt: now,
          });
          transitioned = true;
        });

        if (transitioned) {
          const [user] = await app.db
            .select()
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);
          app.eventBus.publishOrderEvent({
            orderId: order.id,
            userId: order.userId,
            status: "confirmed",
            telegramId: user?.telegramId,
            total: order.total,
          });
        }
        return { success: true };
      }

      if (verified.status === "canceled" || verified.status === "cancelled") {
        const orderItems = (order.items ?? []) as CartItem[];

        if (order.status !== "created" || !isOrderStatus(order.status)) {
          return { success: true, ignored: true };
        }
        const allowed = ORDER_STATUS_FLOW.created;
        if (!allowed.includes("failed_payment")) {
          return { success: true, ignored: true };
        }

        let transitioned = false;
        await app.db.transaction(async (tx) => {
          const [row] = await tx
            .update(orders)
            .set({ status: "failed_payment", updatedAt: now })
            .where(and(eq(orders.id, order.id), eq(orders.status, "created")))
            .returning();

          if (!row) return;

          await tx.insert(orderTimeline).values({
            id: randomUUID(),
            orderId: order.id,
            status: "failed_payment",
            note: "Оплата отменена",
            createdAt: now,
          });

          for (const item of orderItems) {
            await tx
              .update(products)
              .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: now })
              .where(eq(products.id, item.productId));
          }
          transitioned = true;
        });

        if (transitioned) {
          const [user] = await app.db
            .select()
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);
          app.eventBus.publishOrderEvent({
            orderId: order.id,
            userId: order.userId,
            status: "failed_payment",
            telegramId: user?.telegramId,
            total: order.total,
          });
        }
        return { success: true };
      }

      return { success: true, ignored: true };
    },
  );
}
