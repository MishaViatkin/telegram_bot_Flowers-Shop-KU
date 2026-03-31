import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { timingSafeEqualString } from "../lib/timing-safe.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    telegramUser: TelegramUser | null;
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

const INIT_DATA_MAX_AGE_SEC = Number(process.env.INIT_DATA_MAX_AGE_SEC) || 86400;

export function validateInitData(
  initData: string,
  botToken: string,
): { valid: boolean; data: Record<string, string> } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false, data: {} };

  params.delete("hash");

  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const data = Object.fromEntries(entries);
  return { valid: timingSafeEqualHex(computedHash, hash), data };
}

/** Constant-time compare for Telegram initData hash (mitigates timing side-channels). */
function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function isFreshInitData(data: Record<string, string>): boolean {
  const raw = data.auth_date;
  if (raw == null || raw === "") return false;
  const authDate = Number.parseInt(raw, 10);
  if (!Number.isFinite(authDate)) return false;
  const ageSec = Date.now() / 1000 - authDate;
  return ageSec >= 0 && ageSec <= INIT_DATA_MAX_AGE_SEC;
}

/**
 * Auth order:
 * 1. INTERNAL_API_SECRET + X-Internal-Secret (timing-safe) + X-User-Id — сервер→сервер (бот)
 * 2. X-Init-Data — Telegram Web App HMAC + проверка auth_date (анти-replay)
 * 3. X-User-Id только вне production (или при ALLOW_DEV_USER_ID_AUTH=true) — локальная разработка
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const configuredSecret = process.env.INTERNAL_API_SECRET?.trim();
  const providedSecret = request.headers["x-internal-secret"];

  if (configuredSecret && typeof providedSecret === "string") {
    if (timingSafeEqualString(configuredSecret, providedSecret)) {
      const uid = request.headers["x-user-id"];
      if (typeof uid === "string" && uid.trim()) {
        const trimmed = uid.trim();
        if (!/^tg-\d+$/.test(trimmed)) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: "Internal auth requires X-User-Id like tg-<telegram_id>",
            },
          });
        }
        request.userId = trimmed;
        request.telegramUser = null;
        return;
      }
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing X-User-Id for internal auth" },
      });
    }
  }

  const initData = request.headers["x-init-data"];

  if (typeof initData === "string" && initData) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return reply.status(500).send({
        success: false,
        error: { code: "SERVER_ERROR", message: "Bot token not configured" },
      });
    }

    const { valid, data } = validateInitData(initData, botToken);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid initData signature" },
      });
    }

    if (!isFreshInitData(data)) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "initData expired; reopen the app" },
      });
    }

    let user: TelegramUser | null = null;
    if (data.user) {
      try {
        user = JSON.parse(data.user);
      } catch {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Malformed user data in initData" },
        });
      }
    }

    if (!user?.id) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "No user in initData" },
      });
    }

    request.userId = `tg-${user.id}`;
    request.telegramUser = user;
    return;
  }

  const allowDevUserId =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_USER_ID_AUTH === "true";

  const userIdHeader = request.headers["x-user-id"];
  if (allowDevUserId && typeof userIdHeader === "string" && userIdHeader.trim()) {
    request.userId = userIdHeader.trim();
    request.telegramUser = null;
    return;
  }

  return reply.status(401).send({
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message: allowDevUserId
        ? "Missing authentication"
        : "Missing X-Init-Data (or set INTERNAL_API_SECRET for trusted clients)",
    },
  });
}
