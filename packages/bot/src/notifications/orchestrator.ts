import type { Bot } from "grammy";
import { orderKeyboard } from "../bot/keyboards/main.js";

export interface OrderNotificationPayload {
  telegramId: number;
  orderId: string;
  status: string;
  total?: number;
}

const STATUS_MESSAGES: Record<string, (id: string, total?: number) => string> = {
  created: (id, total) =>
    `✅ Заказ #${id.slice(0, 8)} создан!\n` +
    (total ? `Сумма: ${total.toLocaleString("ru-RU")} ₽\n` : "") +
    `Мы уже начали его обработку.`,
  confirmed: (id) => `👍 Заказ #${id.slice(0, 8)} подтверждён!\nФлористы собирают ваш букет.`,
  in_delivery: (id) => `🚗 Заказ #${id.slice(0, 8)} передан курьеру!\nСкоро будет у вас.`,
  delivered: (id) =>
    `🎉 Заказ #${id.slice(0, 8)} доставлен!\nСпасибо, что выбрали нас!\n\nОставьте отзыв или поделитесь с друзьями.`,
  cancelled: (id) => `❌ Заказ #${id.slice(0, 8)} отменён.\nЕсли это ошибка — напишите нам.`,
  failed_payment: (id) =>
    `⚠️ Оплата по заказу #${id.slice(0, 8)} не прошла. Заказ отменён.\nМожно оформить заказ заново.`,
};

export function createNotificationOrchestrator(bot: Bot) {
  return {
    async notifyOrderStatus(payload: OrderNotificationPayload) {
      const messageFn = STATUS_MESSAGES[payload.status];
      if (!messageFn) {
        console.warn(`[notifications] Unknown status: ${payload.status}`);
        return;
      }

      try {
        const text = messageFn(payload.orderId, payload.total);
        const keyboard =
          payload.status === "created" || payload.status === "in_delivery"
            ? orderKeyboard(payload.orderId)
            : undefined;

        await bot.api.sendMessage(payload.telegramId, text, {
          reply_markup: keyboard,
        });
      } catch (err) {
        console.error(`[notifications] Failed to send to ${payload.telegramId}:`, err);
      }
    },
  };
}
