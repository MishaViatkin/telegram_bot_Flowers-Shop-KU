import type { Context } from "grammy";

export async function handleHelp(ctx: Context) {
  await ctx.reply(
    `📞 Помощь и контакты\n\n` +
      `Если у вас есть вопросы по заказу или доставке:\n\n` +
      `• Напишите нам прямо в этот чат\n` +
      `• Позвоните: +7 (XXX) XXX-XX-XX\n\n` +
      `⏰ Режим работы: 9:00 — 21:00, без выходных\n` +
      `🚗 Доставка по всему Каменску-Уральскому`,
  );
}
