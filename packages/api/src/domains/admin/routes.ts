import type { OrderStatus } from "@flowers-tg/shared";
import { ORDER_STATUS_FLOW } from "@flowers-tg/shared";
import { desc, eq, ilike, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { orders, orderTimeline, products, users } from "../../infra/db/schema.js";

interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

function isOrderStatus(value: string): value is OrderStatus {
  return Object.hasOwn(ORDER_STATUS_FLOW, value);
}

const patchOrderStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().max(2000).optional(),
});

const patchProductSchema = z.object({
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  price: z.number().positive().optional(),
});

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/orders", async (request) => {
    const q = request.query as { limit?: string; offset?: string };
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 50));
    const offset = Math.max(0, Number(q.offset) || 0);

    const [{ total }] = await app.db.select({ total: sql<number>`count(*)::int` }).from(orders);

    const rows = await app.db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const userRows =
      userIds.length > 0 ? await app.db.select().from(users).where(inArray(users.id, userIds)) : [];
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    return {
      success: true,
      data: {
        items: rows.map((o) => ({
          ...o,
          user: userMap.get(o.userId) ?? null,
        })),
        total,
        limit,
        offset,
      },
    };
  });

  app.patch<{ Params: { id: string } }>("/orders/:id/status", async (request, reply) => {
    const parsed = patchOrderStatusSchema.safeParse(request.body);
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

    const [order] = await app.db.select().from(orders).where(eq(orders.id, id)).limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Заказ не найден" },
      });
    }

    if (!isOrderStatus(order.status)) {
      return reply.status(409).send({
        success: false,
        error: { code: "INVALID_STATE", message: "Некорректный текущий статус заказа" },
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
        .where(eq(orders.id, id))
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
        error: { code: "NOT_FOUND", message: "Заказ не найден после обновления" },
      });
    }

    const userId = updated.userId;
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

  app.get("/products", async (request) => {
    const q = request.query as { limit?: string; offset?: string; search?: string };
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 100));
    const offset = Math.max(0, Number(q.offset) || 0);
    const search = q.search?.trim();

    const titleFilter = search ? ilike(products.title, `%${escapeLike(search)}%`) : undefined;

    const countQuery = app.db.select({ total: sql<number>`count(*)::int` }).from(products);
    const [{ total }] = titleFilter ? await countQuery.where(titleFilter) : await countQuery;

    const base = app.db.select().from(products);
    const rows = titleFilter
      ? await base.where(titleFilter).orderBy(desc(products.updatedAt)).limit(limit).offset(offset)
      : await base.orderBy(desc(products.updatedAt)).limit(limit).offset(offset);

    return {
      success: true,
      data: {
        items: rows,
        total,
        limit,
        offset,
      },
    };
  });

  app.patch<{ Params: { id: string } }>("/products/:id", async (request, reply) => {
    const parsed = patchProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
    }

    const { id } = request.params;
    const body = parsed.data;
    if (body.stock === undefined && body.active === undefined && body.price === undefined) {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "Укажите хотя бы одно поле: stock, active, price" },
      });
    }

    const [existing] = await app.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Товар не найден" },
      });
    }

    const updatedAt = new Date();
    const [row] = await app.db
      .update(products)
      .set({
        ...(body.stock !== undefined ? { stock: body.stock } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        updatedAt,
      })
      .where(eq(products.id, id))
      .returning();

    return { success: true, data: row };
  });
}
