import { InlineKeyboard } from "grammy";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "Flowers_Shop_KU_bot";

export function mainMenuKeyboard() {
  return new InlineKeyboard()
    .webApp("Открыть магазин", `https://t.me/${BOT_USERNAME}/app`)
    .row()
    .text("Мои заказы", "my_orders")
    .text("Помощь", "help");
}

export function catalogKeyboard() {
  return new InlineKeyboard().webApp("Каталог цветов", `https://t.me/${BOT_USERNAME}/app`);
}

export function orderKeyboard(orderId: string) {
  return new InlineKeyboard().webApp(
    "Отследить заказ",
    `https://t.me/${BOT_USERNAME}/app?startapp=order_${orderId}`,
  );
}

export function referralKeyboard(userId: number) {
  return new InlineKeyboard().url(
    "Пригласить друга",
    `https://t.me/${BOT_USERNAME}?startapp=ref_${userId}`,
  );
}
