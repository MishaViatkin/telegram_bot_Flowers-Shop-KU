import "dotenv/config";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyRequest } from "fastify";
import Fastify from "fastify";
import { Bot } from "grammy";
import { handleHelp } from "./bot/commands/help.js";
import { handleStart } from "./bot/commands/start.js";
import { catalogKeyboard, mainMenuKeyboard } from "./bot/keyboards/main.js";
import { loggingMiddleware } from "./bot/middleware/logging.js";
import { timingSafeEqualString } from "./lib/timing-safe.js";
import type { OrderNotificationPayload } from "./notifications/orchestrator.js";
import { createNotificationOrchestrator } from "./notifications/orchestrator.js";
import { registerTelegramWebhook } from "./webhook/telegram.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET is required in production (Telegram webhook secret_token)",
    );
  }
}

const bot = new Bot(token);
const notifications = createNotificationOrchestrator(bot);

bot.use(loggingMiddleware);

bot.command("start", handleStart);
bot.command("help", handleHelp);
bot.command("catalog", async (ctx) => {
  await ctx.reply("Откройте наш каталог:", { reply_markup: catalogKeyboard() });
});
bot.command("cart", async (ctx) => {
  const username = process.env.TELEGRAM_BOT_USERNAME || "Flowers_Shop_KU_bot";
  const { InlineKeyboard } = await import("grammy");
  await ctx.reply("Ваша корзина:", {
    reply_markup: new InlineKeyboard().webApp(
      "Открыть корзину",
      `https://t.me/${username}/app?startapp=cart`,
    ),
  });
});

bot.callbackQuery("my_orders", async (ctx) => {
  await ctx.answerCallbackQuery();
  const username = process.env.TELEGRAM_BOT_USERNAME || "Flowers_Shop_KU_bot";
  const { InlineKeyboard } = await import("grammy");
  await ctx.reply("Ваши заказы:", {
    reply_markup: new InlineKeyboard().webApp(
      "Открыть заказы",
      `https://t.me/${username}/app?startapp=orders`,
    ),
  });
});

bot.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleHelp(ctx);
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(
    "Я — бот «Цветы Любимого Города» 🌸\n\n" +
      "Чтобы заказать цветы, нажмите кнопку ниже или отправьте /start",
    { reply_markup: mainMenuKeyboard() },
  );
});

const app = Fastify({
  bodyLimit:
    Number(process.env.BOT_BODY_LIMIT_BYTES) > 0
      ? Number(process.env.BOT_BODY_LIMIT_BYTES)
      : 64 * 1024,
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
      'req.headers["x-telegram-bot-api-secret-token"]',
      'req.headers["x-internal-secret"]',
      "req.headers.authorization",
    ],
  },
});
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, {
  global: true,
  max: Number(process.env.BOT_RATE_LIMIT_MAX) || 120,
  timeWindow: Number(process.env.BOT_RATE_LIMIT_WINDOW_MS) || 60_000,
  allowList: (request: FastifyRequest) => {
    const url = request.url.split("?")[0] ?? request.url;
    return url === "/health";
  },
});

app.setNotFoundHandler(async (_request, reply) => {
  return reply.status(404).send({ error: "Not found" });
});

app.setErrorHandler(async (err, request, reply) => {
  request.log.error({ err, url: request.url, reqId: request.id }, "Unhandled error");
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  const message = statusCode >= 500 ? "Internal error" : (err as Error).message || "Bad request";
  return reply.status(statusCode).send({ error: message });
});

registerTelegramWebhook(app, bot);

app.get("/health", async () => ({ status: "ok", service: "bot" }));

/**
 * Internal endpoint for the API to push order notifications.
 * Protected by shared secret in production.
 */
app.post<{ Body: OrderNotificationPayload }>("/internal/notify", async (request, reply) => {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    return reply.status(503).send({ error: "INTERNAL_API_SECRET is not configured" });
  }
  const provided = request.headers["x-internal-secret"];
  if (typeof provided !== "string" || !timingSafeEqualString(provided, secret)) {
    return reply.status(403).send({ error: "Forbidden" });
  }

  const payload = request.body;
  if (
    !payload ||
    typeof payload.telegramId !== "number" ||
    !Number.isInteger(payload.telegramId) ||
    payload.telegramId <= 0 ||
    typeof payload.orderId !== "string" ||
    !payload.orderId.trim() ||
    typeof payload.status !== "string" ||
    !payload.status.trim()
  ) {
    return reply.status(400).send({ error: "Missing required fields" });
  }

  await notifications.notifyOrderStatus(payload);
  return { success: true };
});

const port = Number(process.env.BOT_PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";
const useWebhook = process.env.NODE_ENV === "production";

let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    app.log.info({ signal }, "Shutting down...");
    if (!useWebhook) {
      bot.stop();
    }
    await app.close();
  } catch (err) {
    app.log.error({ err }, "Shutdown error");
  } finally {
    process.exit(0);
  }
}

async function start() {
  if (useWebhook) {
    await app.listen({ port, host });
    console.log(`Bot webhook server listening on ${host}:${port}`);
  } else {
    await app.listen({ port, host });
    console.log(`Bot HTTP server listening on ${host}:${port}`);
    console.log("Starting bot in long-polling mode...");
    await bot.start({
      onStart: () => console.log("Bot started in long-polling mode"),
    });
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

start().catch((err) => {
  console.error("Bot startup failed:", err);
  process.exit(1);
});
