import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { drizzle } from "drizzle-orm/postgres-js";
import Fastify from "fastify";
import postgres from "postgres";
import { adminRoutes } from "./domains/admin/routes.js";
import { cartRoutes } from "./domains/cart/routes.js";
import { catalogRoutes } from "./domains/catalog/routes.js";
import { ordersRoutes } from "./domains/orders/routes.js";
import { paymentsRoutes } from "./domains/payments/routes.js";
import { usersRoutes } from "./domains/users/routes.js";
import { yookassaWebhookRoutes } from "./domains/webhooks/yookassa.js";
import * as schema from "./infra/db/schema.js";
import { eventBus } from "./infra/events/bus.js";
import { adminAuthMiddleware } from "./middleware/admin-auth.js";
import { authMiddleware } from "./middleware/auth.js";
import "./infra/events/notify-bridge.js";

declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle<typeof schema>>;
    eventBus: typeof eventBus;
  }
}

function parsePublicHttpsUrl(raw: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use https://`);
  }
  return url;
}

export async function buildApp() {
  const isProd = process.env.NODE_ENV === "production";
  const corsOrigins = process.env.CORS_ORIGIN?.trim();
  const corsOptions =
    corsOrigins && corsOrigins.length > 0
      ? {
          origin: corsOrigins
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        }
      : isProd
        ? { origin: false as const }
        : { origin: true as const };

  const bodyLimit =
    Number(process.env.BODY_LIMIT_BYTES) > 0
      ? Number(process.env.BODY_LIMIT_BYTES)
      : 1 * 1024 * 1024;

  const app = Fastify({
    bodyLimit,
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        'req.headers["x-init-data"]',
        'req.headers["x-internal-secret"]',
        'req.headers["x-admin-secret"]',
        "req.headers.authorization",
      ],
    },
  });

  if (isProd) {
    if (!corsOrigins) {
      app.log.error(
        "SECURITY: CORS_ORIGIN is required in production for the mini-app to work in browsers/Telegram WebView.",
      );
      throw new Error("CORS_ORIGIN is required in production");
    }
    const miniAppPublicUrl = process.env.MINI_APP_PUBLIC_URL?.trim();
    if (miniAppPublicUrl) {
      parsePublicHttpsUrl(miniAppPublicUrl, "MINI_APP_PUBLIC_URL");
    }
    if (process.env.ALLOW_DEV_USER_ID_AUTH === "true") {
      app.log.warn(
        "SECURITY: ALLOW_DEV_USER_ID_AUTH=true in production — X-User-Id auth is enabled; disable for real users.",
      );
    }
    if (process.env.ALLOW_USER_ORDER_STATUS_PATCH === "true") {
      app.log.warn(
        "SECURITY: ALLOW_USER_ORDER_STATUS_PATCH=true in production — clients can change order status via PATCH.",
      );
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });
  app.decorate("db", db);
  app.decorate("eventBus", eventBus);
  app.addHook("onClose", async () => {
    // Ensure DB connections are closed on shutdown (SIGTERM/SIGINT).
    await client.end();
  });

  await app.register(cors, corsOptions);
  await app.register(helmet, {
    // Telegram WebView behaves like a browser; defaults are fine here.
    // We avoid enabling any CSP by default to not accidentally break mini-app hosting setups.
    contentSecurityPolicy: false,
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: { code: "NOT_FOUND", message: "Not found" },
    });
  });

  app.setErrorHandler(async (err, request, reply) => {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const errorCode = (err as { errorCode?: string }).errorCode ?? "SERVER_ERROR";
    const message =
      statusCode >= 500 ? "Внутренняя ошибка сервера" : (err as Error).message || "Ошибка запроса";

    request.log.error({ err, url: request.url, reqId: request.id }, "Unhandled error");

    return reply.status(statusCode).send({
      success: false,
      error: { code: String(errorCode), message },
    });
  });

  const maxGlobal = Number(process.env.RATE_LIMIT_MAX) || 400;
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;

  await app.register(rateLimit, {
    global: true,
    max: maxGlobal,
    timeWindow: windowMs,
    allowList: (request) => {
      const url = request.url.split("?")[0] ?? request.url;
      return url === "/health";
    },
  });

  app.get("/health", async () => ({ status: "ok" }));

  if (!isProd) {
    app.get("/debug/env", async () => ({
      nodeEnv: process.env.NODE_ENV ?? null,
      hasInternalSecret: Boolean(process.env.INTERNAL_API_SECRET?.trim()),
      allowDevUserIdAuth: process.env.ALLOW_DEV_USER_ID_AUTH === "true",
    }));
  }

  await app.register(yookassaWebhookRoutes, { prefix: "/api" });

  app.register(
    async (admin) => {
      // Separate, stricter limiter for admin endpoints to mitigate secret brute force.
      await admin.register(rateLimit, {
        global: true,
        max: Number(process.env.ADMIN_RATE_LIMIT_MAX) || 30,
        timeWindow: Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 60_000,
      });
      admin.addHook("preHandler", adminAuthMiddleware);
      await admin.register(adminRoutes);
    },
    { prefix: "/api/admin" },
  );

  app.register(
    async (api) => {
      api.register(catalogRoutes);

      api.register(async (authed) => {
        authed.addHook("preHandler", authMiddleware);
        authed.register(cartRoutes, { prefix: "/cart" });
        authed.register(ordersRoutes, { prefix: "/orders" });
        authed.register(paymentsRoutes, { prefix: "/payments" });
        authed.register(usersRoutes, { prefix: "/users" });
      });
    },
    { prefix: "/api" },
  );

  return app;
}
