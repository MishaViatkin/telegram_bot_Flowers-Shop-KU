import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Bot } from "grammy";
import { webhookCallback } from "grammy";
import { timingSafeEqualString } from "../lib/timing-safe.js";

export async function registerTelegramWebhook(app: FastifyInstance, bot: Bot) {
  const handleUpdate = webhookCallback(bot, "fastify") as (
    request: unknown,
    reply: unknown,
  ) => Promise<void>;

  app.post("/webhook/telegram", async (request: FastifyRequest, reply: FastifyReply) => {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (expected) {
      const provided = request.headers["x-telegram-bot-api-secret-token"];
      if (typeof provided !== "string" || !timingSafeEqualString(provided, expected)) {
        return reply.status(403).send({ error: "Forbidden" });
      }
    }
    await handleUpdate(request, reply);
  });
}
