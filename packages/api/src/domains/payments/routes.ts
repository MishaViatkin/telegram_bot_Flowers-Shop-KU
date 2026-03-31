import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { orders, payments } from "../../infra/db/schema.js";
import { createPayment, formatAmountRub, getPayment } from "../../infra/yookassa/client.js";

const createBodySchema = z.object({
  orderId: z.string().uuid(),
});

function getMiniAppReturnUrl(orderId: string): string {
  const base = process.env.MINI_APP_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (!base) {
    throw Object.assign(
      new Error("MINI_APP_PUBLIC_URL is not set (needed for payment return_url)"),
      { code: "MISSING_RETURN_BASE" },
    );
  }
  return `${base}/payment/return?order_id=${encodeURIComponent(orderId)}`;
}

export async function paymentsRoutes(app: FastifyInstance) {
  /**
   * POST /api/payments — создать платёж YooKassa и получить confirmation_url
   */
  app.post("/", async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
    }
    const { orderId } = parsed.data;
    const userId = request.userId;

    const [order] = await app.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Заказ не найден" },
      });
    }

    if (order.paymentMethod !== "card_online") {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "Онлайн-оплата не выбрана для этого заказа" },
      });
    }

    if (order.status !== "created") {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_STATE", message: "Заказ недоступен для оплаты" },
      });
    }

    const [paidOk] = await app.db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, "succeeded")))
      .limit(1);

    if (paidOk) {
      return reply.status(400).send({
        success: false,
        error: { code: "ALREADY_PAID", message: "Заказ уже оплачен" },
      });
    }

    let returnUrl: string;
    try {
      returnUrl = getMiniAppReturnUrl(orderId);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "MISSING_RETURN_BASE") {
        return reply.status(503).send({
          success: false,
          error: {
            code: "SERVER_ERROR",
            message: "Не настроен MINI_APP_PUBLIC_URL для возврата после оплаты",
          },
        });
      }
      throw e;
    }

    const idempotenceKey = randomUUID();
    let snapshot: Awaited<ReturnType<typeof createPayment>>;
    try {
      snapshot = await createPayment({
        amountRub: order.total,
        orderId,
        description: `Заказ ${orderId.slice(0, 8)}`,
        idempotenceKey,
        returnUrl,
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === "YOOKASSA_NOT_CONFIGURED") {
        return reply.status(503).send({
          success: false,
          error: {
            code: "PAYMENT_UNAVAILABLE",
            message: "Онлайн-оплата временно недоступна",
          },
        });
      }
      app.log.error({ err: e }, "YooKassa createPayment failed");
      return reply.status(502).send({
        success: false,
        error: {
          code: "PROVIDER_ERROR",
          message: "Не удалось создать платёж. Попробуйте позже.",
        },
      });
    }

    if (!snapshot.confirmationUrl) {
      return reply.status(502).send({
        success: false,
        error: { code: "PROVIDER_ERROR", message: "Платёж создан без URL подтверждения" },
      });
    }

    const paymentRowId = randomUUID();
    const now = new Date();

    await app.db.insert(payments).values({
      id: paymentRowId,
      orderId,
      provider: "yookassa",
      externalId: snapshot.id,
      amount: Number.parseFloat(formatAmountRub(order.total)),
      currency: "RUB",
      status: snapshot.status,
      confirmationUrl: snapshot.confirmationUrl,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      data: {
        paymentId: paymentRowId,
        externalId: snapshot.id,
        confirmationUrl: snapshot.confirmationUrl,
        status: snapshot.status,
      },
    };
  });

  /**
   * GET /api/payments/order/:orderId — последний платёж по заказу (сверка после редиректа)
   */
  app.get<{ Params: { orderId: string } }>("/order/:orderId", async (request, reply) => {
    const { orderId } = request.params;
    const userId = request.userId;

    const [order] = await app.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Заказ не найден" },
      });
    }

    const [row] = await app.db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (!row) {
      return { success: true, data: null };
    }

    let liveStatus = row.status;
    try {
      const remote = await getPayment(row.externalId);
      liveStatus = remote.status;
      if (remote.status !== row.status) {
        await app.db
          .update(payments)
          .set({ status: remote.status, updatedAt: new Date() })
          .where(eq(payments.id, row.id));
      }
    } catch {
      /* оставляем статус из БД */
    }

    return {
      success: true,
      data: {
        id: row.id,
        provider: row.provider,
        externalId: row.externalId,
        status: liveStatus,
        amount: row.amount,
        currency: row.currency,
        orderId: row.orderId,
      },
    };
  });
}
