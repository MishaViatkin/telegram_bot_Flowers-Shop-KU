import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { promoCodes, referrals, users } from "../../infra/db/schema.js";
import { ensureUser } from "../cart/routes.js";

async function findReferrerByInviteCode(app: FastifyInstance, code: string) {
  const [byRefCode] = await app.db
    .select()
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);
  if (byRefCode) return byRefCode;
  if (/^\d+$/.test(code)) {
    const id = `tg-${code}`;
    const [byTgId] = await app.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (byTgId) return byTgId;
  }
  return undefined;
}

export async function usersRoutes(app: FastifyInstance) {
  /**
   * GET /api/users/me — get current user profile
   */
  app.get("/me", async (request) => {
    const userId = request.userId;
    await ensureUser(app, userId);
    const [user] = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { success: true, data: null };
    return {
      success: true,
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        referralCode: user.referralCode,
        firstOrderPromoIssued: user.firstOrderPromoIssued,
        createdAt: user.createdAt.toISOString(),
      },
    };
  });

  /**
   * POST /api/users/referral — attribute a referral
   * Body: { referrerCode: string }
   */
  app.post("/referral", async (request, reply) => {
    const userId = request.userId;
    await ensureUser(app, userId);

    const body = request.body as { referrerCode?: unknown };
    const code = typeof body.referrerCode === "string" ? body.referrerCode.trim() : "";
    if (code.length > 128) {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "referrerCode is too long" },
      });
    }
    if (!code) {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "referrerCode is required" },
      });
    }

    const [currentUser] = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!currentUser) {
      return reply
        .status(404)
        .send({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    }

    if (currentUser.referredBy) {
      return reply.status(400).send({
        success: false,
        error: { code: "ALREADY_REFERRED", message: "Вы уже были приглашены" },
      });
    }

    const referrer = await findReferrerByInviteCode(app, code);
    if (!referrer) {
      return reply.status(404).send({
        success: false,
        error: { code: "REFERRER_NOT_FOUND", message: "Код приглашения не найден" },
      });
    }

    if (referrer.id === userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "SELF_REFERRAL", message: "Нельзя пригласить себя" },
      });
    }

    await app.db.update(users).set({ referredBy: referrer.id }).where(eq(users.id, userId));

    try {
      await app.db.insert(referrals).values({
        id: randomUUID(),
        referrerId: referrer.id,
        referredUserId: userId,
        status: "pending",
        rewardAmount: 200,
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "23505") {
        return reply.status(400).send({
          success: false,
          error: { code: "ALREADY_REFERRED", message: "Реферал уже зарегистрирован" },
        });
      }
      throw err;
    }

    return { success: true, data: { referredBy: referrer.id } };
  });

  /**
   * POST /api/users/first-order-promo — issue -10% promo for new user
   * Idempotent: returns existing promo if already issued
   */
  app.post("/first-order-promo", async (request, reply) => {
    const userId = request.userId;
    await ensureUser(app, userId);

    const [user] = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return reply
        .status(404)
        .send({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    }

    if (user.firstOrderPromoIssued) {
      const [existing] = await app.db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.userId, userId))
        .limit(1);
      if (existing) {
        return { success: true, data: { code: existing.code, alreadyIssued: true } };
      }
    }

    const promoCode = `WELCOME-${userId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6)
      .toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    try {
      await app.db.insert(promoCodes).values({
        id: randomUUID(),
        code: promoCode,
        type: "percentage",
        value: 10,
        validUntil,
        minOrderAmount: null,
        maxUses: 1,
        usedCount: 0,
        userId,
        active: true,
      });

      await app.db.update(users).set({ firstOrderPromoIssued: true }).where(eq(users.id, userId));
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "23505") {
        const [existing] = await app.db
          .select()
          .from(promoCodes)
          .where(eq(promoCodes.userId, userId))
          .limit(1);
        if (existing) {
          return { success: true, data: { code: existing.code, alreadyIssued: true } };
        }
      }
      throw err;
    }

    return { success: true, data: { code: promoCode, alreadyIssued: false } };
  });
}
