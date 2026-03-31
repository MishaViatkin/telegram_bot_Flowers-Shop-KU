import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { carts, products, promoCodes, users } from "../../infra/db/schema.js";

type CartItemRow = {
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
};

type PromoRow = typeof promoCodes.$inferSelect;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function safeItems(raw: unknown): CartItemRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (it): it is CartItemRow =>
      it &&
      typeof it.productId === "string" &&
      typeof it.price === "number" &&
      typeof it.quantity === "number",
  );
}

function isPromoApplicable(promo: PromoRow, subtotal: number, userId: string): boolean {
  if (!promo.active) return false;
  if (promo.usedCount >= promo.maxUses) return false;
  const expiry = new Date(promo.validUntil).getTime();
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  if (promo.minOrderAmount != null && subtotal < promo.minOrderAmount) return false;
  if (promo.userId != null && promo.userId !== userId) return false;
  if (promo.type !== "percentage" && promo.type !== "fixed") return false;
  return true;
}

function computeTotals(
  items: CartItemRow[],
  promo: PromoRow | undefined,
  userId: string,
): { subtotal: number; discount: number; total: number } {
  const subtotal = round2(items.reduce((sum, it) => sum + it.price * it.quantity, 0));
  let discount = 0;
  if (promo && isPromoApplicable(promo, subtotal, userId)) {
    if (promo.type === "percentage") {
      discount = round2(Math.min(subtotal, subtotal * (Math.min(promo.value, 100) / 100)));
    } else {
      discount = round2(Math.min(promo.value, subtotal));
    }
  }
  const total = round2(Math.max(0, subtotal - discount));
  return { subtotal, discount, total };
}

export async function ensureUser(app: FastifyInstance, userId: string): Promise<void> {
  const [existing] = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing) return;

  const tgMatch = /^tg-(\d+)$/.exec(userId);
  const telegramId = tgMatch
    ? Number(tgMatch[1])
    : (() => {
        const hash = userId
          .split("")
          .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
        return (Math.abs(hash) % 1_000_000_000) + 1_000_000_000;
      })();

  try {
    await app.db.insert(users).values({
      id: userId,
      telegramId,
      firstName: "Guest",
      referralCode: randomUUID(),
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "23505") return;
    throw err;
  }
}

async function getOrCreateCartRow(app: FastifyInstance, userId: string) {
  const [existing] = await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (existing) return existing;
  const id = randomUUID();
  try {
    await app.db.insert(carts).values({ id, userId, items: [] });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      const [again] = await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      if (again) return again;
    }
    throw err;
  }
  const [created] = await app.db.select().from(carts).where(eq(carts.id, id)).limit(1);
  return created ?? (await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1))[0];
}

async function loadPromoByCode(
  app: FastifyInstance,
  code: string | null,
): Promise<PromoRow | undefined> {
  if (!code) return undefined;
  const [row] = await app.db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
  return row;
}

function toCartPayload(
  row: {
    id: string;
    userId: string;
    items: CartItemRow[];
    promoCode: string | null;
    updatedAt: Date;
  },
  totals: { subtotal: number; discount: number; total: number },
) {
  return {
    id: row.id,
    userId: row.userId,
    items: row.items,
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    ...(row.promoCode ? { promoCode: row.promoCode } : {}),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function emptyCartPayload(userId: string) {
  return {
    id: "",
    userId,
    items: [] as CartItemRow[],
    subtotal: 0,
    discount: 0,
    total: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function cartRoutes(app: FastifyInstance) {
  app.get("/", async (request) => {
    const userId = request.userId;
    await ensureUser(app, userId);
    const [row] = await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (!row) {
      return { success: true, data: emptyCartPayload(userId) };
    }
    const items = safeItems(row.items);
    const promo = await loadPromoByCode(app, row.promoCode);
    const totals = computeTotals(items, promo, userId);
    return { success: true, data: toCartPayload({ ...row, items }, totals) };
  });

  app.post("/items", async (request, reply) => {
    const userId = request.userId;
    await ensureUser(app, userId);
    const body = request.body as { productId?: unknown; quantity?: unknown };
    const productId = typeof body.productId === "string" ? body.productId : "";
    const quantity = typeof body.quantity === "number" ? body.quantity : NaN;
    if (
      !productId ||
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 99
    ) {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid productId or quantity" },
      });
    }
    const [product] = await app.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product?.active) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Product not found" },
      });
    }

    if (product.stock <= 0) {
      return reply.status(400).send({
        success: false,
        error: { code: "OUT_OF_STOCK", message: "Товар закончился" },
      });
    }

    const cartRow = await getOrCreateCartRow(app, userId);
    const items = safeItems(cartRow.items);
    const image =
      Array.isArray(product.images) && product.images.length > 0 ? String(product.images[0]) : "";
    const nextItems: CartItemRow[] = [...items];
    const idx = nextItems.findIndex((i) => i.productId === productId);
    const currentQty = idx >= 0 ? nextItems[idx].quantity : 0;
    const newQty = Math.min(currentQty + quantity, 99, product.stock);

    if (idx >= 0) {
      nextItems[idx] = {
        ...nextItems[idx],
        title: product.title,
        price: product.price,
        image,
        quantity: newQty,
      };
    } else {
      nextItems.push({
        productId,
        title: product.title,
        price: product.price,
        image,
        quantity: newQty,
      });
    }
    const now = new Date();
    await app.db
      .update(carts)
      .set({ items: nextItems, updatedAt: now })
      .where(eq(carts.id, cartRow.id));
    const [updated] = await app.db.select().from(carts).where(eq(carts.id, cartRow.id)).limit(1);
    if (!updated)
      return reply
        .status(500)
        .send({ success: false, error: { code: "SERVER_ERROR", message: "Cart update failed" } });
    const promo = await loadPromoByCode(app, updated.promoCode);
    const totals = computeTotals(safeItems(updated.items), promo, userId);
    return {
      success: true,
      data: toCartPayload({ ...updated, items: safeItems(updated.items) }, totals),
    };
  });

  app.patch<{ Params: { productId: string } }>("/items/:productId", async (request, reply) => {
    const userId = request.userId;
    await ensureUser(app, userId);
    const { productId } = request.params;
    const body = request.body as { quantity?: unknown };
    const quantity = typeof body.quantity === "number" ? body.quantity : NaN;
    if (
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 99
    ) {
      return reply
        .status(400)
        .send({ success: false, error: { code: "BAD_REQUEST", message: "Invalid quantity" } });
    }
    const [cartRow] = await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (!cartRow)
      return reply
        .status(404)
        .send({ success: false, error: { code: "NOT_FOUND", message: "Cart not found" } });

    const items = safeItems(cartRow.items);
    let nextItems: CartItemRow[];
    if (quantity === 0) {
      nextItems = items.filter((i) => i.productId !== productId);
    } else {
      const idx = items.findIndex((i) => i.productId === productId);
      if (idx < 0)
        return reply
          .status(404)
          .send({ success: false, error: { code: "NOT_FOUND", message: "Item not in cart" } });
      nextItems = items.map((i, j) => (j === idx ? { ...i, quantity } : i));
    }
    const now = new Date();
    await app.db
      .update(carts)
      .set({ items: nextItems, updatedAt: now })
      .where(eq(carts.id, cartRow.id));
    const [updated] = await app.db.select().from(carts).where(eq(carts.id, cartRow.id)).limit(1);
    if (!updated)
      return reply
        .status(500)
        .send({ success: false, error: { code: "SERVER_ERROR", message: "Cart update failed" } });
    const promo = await loadPromoByCode(app, updated.promoCode);
    const totals = computeTotals(safeItems(updated.items), promo, userId);
    return {
      success: true,
      data: toCartPayload({ ...updated, items: safeItems(updated.items) }, totals),
    };
  });

  app.delete<{ Params: { productId: string } }>("/items/:productId", async (request, reply) => {
    const userId = request.userId;
    const [cartRow] = await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (!cartRow) return { success: true, data: emptyCartPayload(userId) };
    const nextItems = safeItems(cartRow.items).filter(
      (i) => i.productId !== request.params.productId,
    );
    const now = new Date();
    await app.db
      .update(carts)
      .set({ items: nextItems, updatedAt: now })
      .where(eq(carts.id, cartRow.id));
    const [updated] = await app.db.select().from(carts).where(eq(carts.id, cartRow.id)).limit(1);
    if (!updated)
      return reply
        .status(500)
        .send({ success: false, error: { code: "SERVER_ERROR", message: "Cart update failed" } });
    const promo = await loadPromoByCode(app, updated.promoCode);
    const totals = computeTotals(safeItems(updated.items), promo, userId);
    return {
      success: true,
      data: toCartPayload({ ...updated, items: safeItems(updated.items) }, totals),
    };
  });

  app.delete("/", async (request) => {
    const userId = request.userId;
    const [cartRow] = await app.db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (!cartRow) return { success: true, data: emptyCartPayload(userId) };
    const now = new Date();
    await app.db
      .update(carts)
      .set({ items: [], promoCode: null, updatedAt: now })
      .where(eq(carts.id, cartRow.id));
    return { success: true, data: emptyCartPayload(userId) };
  });

  app.post("/promo", async (request, reply) => {
    const userId = request.userId;
    await ensureUser(app, userId);
    const body = request.body as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code || code.length > 64) {
      return reply
        .status(400)
        .send({ success: false, error: { code: "BAD_REQUEST", message: "Invalid promo code" } });
    }

    const [promo] = await app.db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code))
      .limit(1);
    if (!promo)
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_PROMO", message: "Promo code not found" },
      });

    const cartRow = await getOrCreateCartRow(app, userId);
    const items = safeItems(cartRow.items);
    const { subtotal } = computeTotals(items, promo, userId);
    if (!isPromoApplicable(promo, subtotal, userId)) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_PROMO", message: "Promo code is not valid for this cart" },
      });
    }
    const now = new Date();
    await app.db
      .update(carts)
      .set({ promoCode: promo.code, updatedAt: now })
      .where(eq(carts.id, cartRow.id));
    const [updated] = await app.db.select().from(carts).where(eq(carts.id, cartRow.id)).limit(1);
    if (!updated)
      return reply
        .status(500)
        .send({ success: false, error: { code: "SERVER_ERROR", message: "Cart update failed" } });
    const totals = computeTotals(safeItems(updated.items), promo, userId);
    return {
      success: true,
      data: toCartPayload({ ...updated, items: safeItems(updated.items) }, totals),
    };
  });
}
