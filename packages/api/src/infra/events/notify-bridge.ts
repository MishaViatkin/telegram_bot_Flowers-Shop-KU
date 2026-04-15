import { type DomainEvent, eventBus } from "./bus.js";

function parseBotNotifyUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("BOT_NOTIFY_URL must be a valid URL");
  }
  if (url.pathname !== "/internal/notify") {
    throw new Error("BOT_NOTIFY_URL must point to /internal/notify");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("BOT_NOTIFY_URL must use https:// in production");
  }
  return url.toString();
}

const BOT_NOTIFY_URL = parseBotNotifyUrl(
  process.env.BOT_NOTIFY_URL || "http://localhost:3001/internal/notify",
);
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET?.trim() || "";

function isOrderNotifyEvent(event: DomainEvent): event is DomainEvent & {
  meta: { telegramId?: number; status: string; total?: number };
} {
  return typeof event.eventType === "string" && event.eventType.startsWith("order.");
}

eventBus.on("*", async (event: DomainEvent) => {
  if (!isOrderNotifyEvent(event)) return;
  const telegramId = event.meta?.telegramId;
  if (telegramId == null) return;

  if (process.env.NODE_ENV === "production" && !INTERNAL_SECRET) {
    console.error("[notify-bridge] Skip notify: set INTERNAL_API_SECRET in production");
    return;
  }

  const payload = {
    telegramId,
    orderId: event.orderId,
    status: event.meta.status,
    total: event.meta.total,
  };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (INTERNAL_SECRET) headers["X-Internal-Secret"] = INTERNAL_SECRET;

    const res = await fetch(BOT_NOTIFY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[notify-bridge] Bot responded ${res.status}`);
    }
  } catch (err) {
    console.error("[notify-bridge] Failed to forward notification:", err);
  }
});
