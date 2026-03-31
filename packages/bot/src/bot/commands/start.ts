import type { Context } from "grammy";
import { mainMenuKeyboard } from "../keyboards/main.js";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET?.trim() || "";

async function apiPost(path: string, body: unknown, telegramUserId: number): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Id": `tg-${telegramUserId}`,
  };
  if (INTERNAL_SECRET) headers["X-Internal-Secret"] = INTERNAL_SECRET;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function handleStart(ctx: Context) {
  const startParam = ctx.match as string | undefined;
  const firstName = ctx.from?.first_name || "друг";
  const tgId = ctx.from?.id;

  if (startParam?.startsWith("ref_") && tgId) {
    const referrerPayload = startParam.slice(4);

    await apiPost("/api/users/referral", { referrerCode: referrerPayload }, tgId);
    await apiPost("/api/users/first-order-promo", {}, tgId);

    await ctx.reply(
      `Привет, ${firstName}! 🌸\n\n` +
        `Ваш друг дарит вам скидку -10% на первый заказ!\n` +
        `А мы — «Цветы Любимого Города» — доставим свежие цветы по всему Каменску-Уральскому.\n\n` +
        `Нажмите кнопку ниже, чтобы выбрать букет:`,
      { reply_markup: mainMenuKeyboard() },
    );
    return;
  }

  if (tgId) {
    await apiPost("/api/users/first-order-promo", {}, tgId);
  }

  await ctx.reply(
    `Добро пожаловать, ${firstName}! 🌷\n\n` +
      `Мы — «Цветы Любимого Города».\n` +
      `6 салонов в Каменске-Уральском, свежие цветы каждый день.\n` +
      `Доставка по городу от 1 часа.\n\n` +
      `🎁 Скидка -10% на первый заказ!\n\n` +
      `Выберите, что хотите сделать:`,
    { reply_markup: mainMenuKeyboard() },
  );
}
