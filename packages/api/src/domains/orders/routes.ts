import type { OrderStatus } from "@flowers-tg/shared";
import { checkoutSchema, ORDER_STATUS_FLOW, SAME_DAY_CUTOFF_HOUR } from "@flowers-tg/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  carts,
  orders,
  orderTimeline,
  products,
  promoCodes,
  users,
} from "../../infra/db/schema.js";
import { ensureUser } from "../cart/routes.js";

function isOrderStatus(value: string): value is OrderStatus {
  return Object.hasOwn(ORDER_STATUS_FLOW, value);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const patchStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().max(2000).optional(),
});

interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

function validateDeliverySlot(
  date: string,
  cutoffHour: number,
): { valid: boolean; reason?: string } {
  const now = new Date();
  const slotDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(slotDate.getTime())) {
    return { valid: false, reason: "Некорректная дата доставки" };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (slotDate < today) return { valid: false, reason: "Дата доставки в прошлом" };

  if (slotDate.getTime() === today.getTime() && now.getHours() >= cutoffHour) {
    return { valid: false, reason: `Заказ на сегодня принимается до ${cutoffHour}:00` };
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);
  if (slotDate > maxDate) return { valid: false, reason: "Максимум 14 дней вперёд" };

  return { valid: true };
}

export async function ordersRoutes(app: FastifyInstance) {
  /**
   * POST /api/orders/validate — pre-validate before checkout
   * Checks: cart not empty, stock availability, price freshness, delivery slot
   */
  app.post("/validate", async (request, reply) => {
    const userId = request.userId;
    await ensureUser(app, userId);

    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: fieldErrors ? JSON.stringify(fieldErrors) : parsed.error.message,
        },
      });
    }
    const body = parsed.data;

    const [cart] = await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: "EMPTY_CART", message: "Корзина пуста" },
      });
    }

    const cartItems = cart.items as CartItem[];
    const productIds = cartItems.map((i) => i.productId);
    const liveProducts = await app.db
      .select({
        id: products.id,
        price: products.price,
        stock: products.stock,
        active: products.active,
        title: products.title,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(liveProducts.map((p) => [p.id, p]));
    const issues: string[] = [];
    const priceChanges: Array<{
      productId: string;
      title: string;
      oldPrice: number;
      newPrice: number;
    }> = [];

    for (const item of cartItems) {
      const live = productMap.get(item.productId);
      if (!live?.active) {
        issues.push(`«${item.title}» больше не доступен`);
        continue;
      }
      if (live.stock < item.quantity) {
        issues.push(
          live.stock === 0
            ? `«${live.title}» закончился`
            : `«${live.title}» — осталось ${live.stock} шт. (в корзине ${item.quantity})`,
        );
      }
      if (live.price !== item.price) {
        priceChanges.push({
          productId: item.productId,
          title: live.title,
          oldPrice: item.price,
          newPrice: live.price,
        });
      }
    }

    const slotCheck = validateDeliverySlot(body.deliverySlot.date, SAME_DAY_CUTOFF_HOUR);
    if (!slotCheck.valid) {
      issues.push(slotCheck.reason ?? "Некорректный слот доставки");
    }

    if (issues.length > 0) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_FAILED", message: issues.join("; ") },
        data: { issues, priceChanges },
      });
    }

    return {
      success: true,
      data: {
        valid: true,
        priceChanges: priceChanges.length > 0 ? priceChanges : undefined,
      },
    };
  });

  /**
   * POST /api/orders — create order with stock validation + price re-check
   */
  app.post("/", async (request, reply) => {
    const userId = request.userId;
    await ensureUser(app, userId);

    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: fieldErrors ? JSON.stringify(fieldErrors) : parsed.error.message,
        },
      });
    }
    const body = parsed.data;

    const slotCheck = validateDeliverySlot(body.deliverySlot.date, SAME_DAY_CUTOFF_HOUR);
    if (!slotCheck.valid) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_SLOT", message: slotCheck.reason ?? "Некорректный слот доставки" },
      });
    }

    const orderId = crypto.randomUUID();
    const now = new Date();

    const created = await app.db
      .transaction(async (tx) => {
        const [cart] = await tx
          .select()
          .from(carts)
          .where(eq(carts.userId, userId))
          .for("update")
          .limit(1);

        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
          throw Object.assign(new Error("Корзина пуста"), {
            statusCode: 400,
            errorCode: "EMPTY_CART",
          });
        }

        const cartItems = cart.items as CartItem[];
        const productIds = cartItems.map((i) => i.productId);
        const liveProducts = await tx
          .select()
          .from(products)
          .where(inArray(products.id, productIds));

        const productMap = new Map(liveProducts.map((p) => [p.id, p]));

        const validatedItems: CartItem[] = [];
        for (const item of cartItems) {
          const live = productMap.get(item.productId);
          if (!live?.active) {
            throw Object.assign(new Error(`«${item.title}» больше не доступен`), {
              statusCode: 400,
              errorCode: "PRODUCT_UNAVAILABLE",
            });
          }
          if (live.stock < item.quantity) {
            throw Object.assign(
              new Error(
                live.stock === 0
                  ? `«${live.title}» закончился`
                  : `«${live.title}» — осталось ${live.stock} шт.`,
              ),
              { statusCode: 400, errorCode: "INSUFFICIENT_STOCK" },
            );
          }
          validatedItems.push({
            ...item,
            price: live.price,
            title: live.title,
            image:
              Array.isArray(live.images) && live.images.length > 0
                ? String(live.images[0])
                : item.image,
          });

          await tx
            .update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: now })
            .where(eq(products.id, item.productId));
        }

        const subtotal = round2(validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0));
        const explicitPromo = body.promoCode?.trim();
        const cartPromo = cart.promoCode?.trim();
        const effectiveCode = explicitPromo || cartPromo;

        let discount = 0;
        let orderPromoCode: string | null = null;

        if (effectiveCode) {
          const updateResult = await tx
            .update(promoCodes)
            .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
            .where(
              and(
                eq(promoCodes.code, effectiveCode),
                eq(promoCodes.active, true),
                sql`${promoCodes.validUntil} > now()`,
                sql`${promoCodes.usedCount} < ${promoCodes.maxUses}`,
              ),
            )
            .returning();

          const promoRow = updateResult[0];

          if (promoRow) {
            const meetsMin = promoRow.minOrderAmount == null || subtotal >= promoRow.minOrderAmount;
            const meetsUser = promoRow.userId == null || promoRow.userId === userId;
            if (meetsMin && meetsUser) {
              orderPromoCode = promoRow.code;
              if (promoRow.type === "percentage") {
                discount = round2(subtotal * (Math.min(promoRow.value, 100) / 100));
              } else if (promoRow.type === "fixed") {
                discount = round2(Math.min(promoRow.value, subtotal));
              }
            } else {
              await tx
                .update(promoCodes)
                .set({ usedCount: sql`${promoCodes.usedCount} - 1` })
                .where(eq(promoCodes.id, promoRow.id));
            }
          } else if (explicitPromo) {
            throw Object.assign(new Error("Промокод недействителен"), {
              statusCode: 400,
              errorCode: "INVALID_PROMO",
            });
          }
        }

        const deliveryFee = 0;
        const total = round2(Math.max(0, subtotal - discount + deliveryFee));

        const [row] = await tx
          .insert(orders)
          .values({
            id: orderId,
            userId,
            status: "created",
            items: validatedItems,
            recipient: body.recipient,
            address: body.address,
            deliverySlot: body.deliverySlot,
            paymentMethod: body.paymentMethod,
            subtotal,
            discount,
            deliveryFee,
            total,
            promoCode: orderPromoCode ?? undefined,
            comment: body.comment,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await tx.insert(orderTimeline).values({
          id: crypto.randomUUID(),
          orderId,
          status: "created",
          note: null,
          createdAt: now,
        });

        await tx
          .update(carts)
          .set({ items: [], promoCode: null, updatedAt: now })
          .where(eq(carts.userId, userId));

        return row;
      })
      .catch((err: unknown) => {
        const e = err as { statusCode?: number; errorCode?: string; message?: string };
        if (e.statusCode && e.errorCode) {
          reply.status(e.statusCode).send({
            success: false,
            error: { code: e.errorCode, message: e.message ?? "Не удалось создать заказ" },
          });
          return null;
        }
        throw err;
      });

    if (created === null) return;

    const [user] = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    app.eventBus.publishOrderEvent({
      orderId: created.id,
      userId,
      status: "created",
      telegramId: user?.telegramId,
      total: created.total,
    });

    return { success: true, data: created };
  });

  app.get("/", async (request) => {
    const userId = request.userId;
    const rows = await app.db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    return { success: true, data: rows };
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params;
    const [row] = await app.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }

    return { success: true, data: row };
  });

  app.get<{ Params: { id: string } }>("/:id/timeline", async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params;
    const [order] = await app.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }

    const entries = await app.db
      .select()
      .from(orderTimeline)
      .where(eq(orderTimeline.orderId, id))
      .orderBy(desc(orderTimeline.createdAt));

    return { success: true, data: entries };
  });

  app.patch<{ Params: { id: string } }>("/:id/status", async (request, reply) => {
    const allowUserStatusPatch =
      process.env.NODE_ENV !== "production" || process.env.ALLOW_USER_ORDER_STATUS_PATCH === "true";
    if (!allowUserStatusPatch) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message:
            "Смена статуса заказа через приложение отключена. Используйте админ-панель или поддержку.",
        },
      });
    }

    const userId = request.userId;

    const parsed = patchStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
    }

    const { id } = request.params;
    const { status: nextStatus, note } = parsed.data;

    if (!isOrderStatus(nextStatus)) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_STATUS", message: "Unknown order status" },
      });
    }

    const [order] = await app.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Order not found" },
      });
    }

    if (!isOrderStatus(order.status)) {
      return reply.status(409).send({
        success: false,
        error: { code: "INVALID_STATE", message: "Order has an invalid current status" },
      });
    }

    const allowed = ORDER_STATUS_FLOW[order.status as OrderStatus];
    if (!allowed.includes(nextStatus)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Нельзя перейти из ${order.status} в ${nextStatus}`,
        },
      });
    }

    const updatedAt = new Date();

    const updated = await app.db.transaction(async (tx) => {
      const [row] = await tx
        .update(orders)
        .set({ status: nextStatus, updatedAt })
        .where(and(eq(orders.id, id), eq(orders.userId, userId)))
        .returning();

      if (!row) return null;

      await tx.insert(orderTimeline).values({
        id: crypto.randomUUID(),
        orderId: id,
        status: nextStatus,
        note: note ?? null,
        createdAt: updatedAt,
      });

      if (nextStatus === "cancelled") {
        const orderItems = (row.items ?? []) as CartItem[];
        for (const item of orderItems) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt })
            .where(eq(products.id, item.productId));
        }
      }

      return row;
    });

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Order not found after update" },
      });
    }

    const [user] = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    app.eventBus.publishOrderEvent({
      orderId: updated.id,
      userId,
      status: nextStatus,
      telegramId: user?.telegramId,
      total: updated.total,
    });

    return { success: true, data: updated };
  });
}
