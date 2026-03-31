import { catalogFiltersSchema } from "@flowers-tg/shared";
import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { categories, products } from "../../infra/db/schema.js";

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/categories", async () => {
    const rows = await app.db.select().from(categories).orderBy(asc(categories.sortOrder));
    return { success: true, data: rows };
  });

  app.get("/products", async (request, reply) => {
    const parsed = catalogFiltersSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
    }
    const query = parsed.data;

    if (query.minPrice != null && query.maxPrice != null && query.minPrice > query.maxPrice) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "minPrice must be <= maxPrice" },
      });
    }

    const conditions = [eq(products.active, true)];

    if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
    if (query.search) conditions.push(ilike(products.title, `%${escapeLike(query.search)}%`));
    if (query.minPrice != null) conditions.push(gte(products.price, query.minPrice));
    if (query.maxPrice != null) conditions.push(lte(products.price, query.maxPrice));

    const orderBy =
      query.sortBy === "price_asc"
        ? asc(products.price)
        : query.sortBy === "price_desc"
          ? desc(products.price)
          : query.sortBy === "newest"
            ? desc(products.createdAt)
            : asc(products.sortOrder);

    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;
    const limit = query.limit;

    const rows = await app.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(Number.isFinite(offset) && offset > 0 ? offset : 0);

    const [{ count }] = await app.db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));

    return {
      success: true,
      data: {
        items: rows,
        total: count,
        nextCursor: offset + rows.length < count ? String(offset + rows.length) : null,
      },
    };
  });

  app.get<{ Params: { id: string } }>("/products/:id", async (request, reply) => {
    const { id } = request.params;
    const [product] = await app.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.active, true)))
      .limit(1);
    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Product not found" },
      });
    }
    return { success: true, data: product };
  });
}
