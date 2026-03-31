import type { DeliveryWindow, OrderStatus } from "@flowers-tg/shared";
import { DELIVERY_WINDOW_LABELS, ORDER_STATUS_LABELS } from "@flowers-tg/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";

interface OrderData {
  id: string;
  status: OrderStatus;
  items: Array<{
    productId: string;
    title: string;
    price: number;
    image: string;
    quantity: number;
  }>;
  recipient: { name: string; phone: string };
  address: { street: string; building: string; apartment?: string };
  deliverySlot: { date: string; window: string };
  paymentMethod: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
}

interface TimelineEntry {
  status: string;
  note: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { variant: "success" | "primary" | "error" | "neutral" | "accent"; color: string }
> = {
  draft: { variant: "neutral", color: "bg-gray-50" },
  created: { variant: "primary", color: "bg-brand-primary/5" },
  confirmed: { variant: "accent", color: "bg-amber-50" },
  in_delivery: { variant: "primary", color: "bg-blue-50" },
  delivered: { variant: "success", color: "bg-green-50" },
  cancelled: { variant: "error", color: "bg-red-50" },
  failed_payment: { variant: "error", color: "bg-red-50" },
};

const STATUS_DESCRIPTIONS: Partial<Record<OrderStatus, string>> = {
  created: "Ожидает подтверждения флориста",
  confirmed: "Флорист собирает ваш букет",
  in_delivery: "Курьер уже в пути",
  delivered: "Спасибо за заказ!",
  cancelled: "Заказ был отменён",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Наличными",
  transfer: "Перевод на карту",
  card_online: "Онлайн оплата",
};

function getWindowLabel(window: string): string {
  return DELIVERY_WINDOW_LABELS[window as DeliveryWindow] ?? window;
}

export function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    Promise.allSettled([
      apiClient<{ data: OrderData }>(`/orders/${id}`),
      apiClient<{ data: TimelineEntry[] }>(`/orders/${id}/timeline`),
    ])
      .then(([orderResult, timelineResult]) => {
        if (cancelled) return;
        if (orderResult.status === "fulfilled") {
          setOrder(orderResult.value.data);
        } else {
          setError(
            orderResult.reason instanceof Error ? orderResult.reason.message : "Ошибка загрузки",
          );
        }
        if (timelineResult.status === "fulfilled") {
          setTimeline(timelineResult.value.data);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="px-4 pt-5 pb-6 animate-pulse">
        <div className="h-7 bg-gray-100 rounded-xl w-1/2 mb-4" />
        <div className="h-20 bg-gray-100 rounded-2xl mb-5" />
        <div className="space-y-3">
          <div className="h-20 bg-gray-100 rounded-2xl" />
          <div className="h-20 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="px-4 pt-5 pb-6 min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center mb-5">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"
            />
          </svg>
        </div>
        <p className="font-semibold mb-1">Заказ не найден</p>
        {error && <p className="text-sm text-[var(--tg-hint)] mb-6">{error}</p>}
        <Button variant="primary" onClick={() => navigate("/orders")}>
          К заказам
        </Button>
      </div>
    );
  }

  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const description = STATUS_DESCRIPTIONS[order.status];

  const handlePayOnline = async () => {
    if (!id) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const payRes = await apiClient<{ data: { confirmationUrl: string } }>("/payments", {
        method: "POST",
        body: JSON.stringify({ orderId: id }),
      });
      const url = payRes.data.confirmationUrl;
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.location.assign(url);
      }
    } catch (e) {
      setPayError((e as Error).message || "Не удалось открыть оплату");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary-dark to-[#7a2340] px-5 pt-7 pb-7">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 left-1/2 h-48 w-[min(100%,26rem)] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-10 right-0 h-36 w-36 rounded-full bg-brand-accent/25 blur-2xl" />
          <div className="absolute bottom-0 left-4 h-28 w-28 rounded-full bg-white/10 blur-xl" />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[1.25rem] font-bold text-white mb-1 tracking-tight leading-snug">
              Заказ
            </h1>
            <p className="text-white/75 text-[13px] leading-relaxed">
              #{order.id.slice(0, 8)} ·{" "}
              {new Date(order.createdAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="shrink-0">
            <Badge variant={config.variant} size="md">
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-6 -mt-4">
        {/* Status card */}
        <div
          className={`rounded-[var(--radius-hero)] p-4 mb-6 border border-white/60 shadow-[var(--shadow-float)] ${config.color}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-brand-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 9.75 12 14.25l-2.25-2.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-0.5">{statusLabel}</p>
              {description && <p className="text-xs text-[var(--tg-hint)]">{description}</p>}
            </div>
          </div>
        </div>

        {order.status === "created" && order.paymentMethod === "card_online" && (
          <div className="mb-6">
            <div className="bg-white rounded-[var(--radius-card)] p-4 border border-[var(--border-brand-subtle)]/40 shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/8 flex items-center justify-center shrink-0 text-brand-primary">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 8.25h16.5M4.5 6.75h15A2.25 2.25 0 0 1 21.75 9v9A2.25 2.25 0 0 1 19.5 20.25h-15A2.25 2.25 0 0 1 2.25 18V9A2.25 2.25 0 0 1 4.5 6.75Z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Нужна оплата</p>
                  <p className="text-[12px] text-[var(--tg-hint)] mt-1 leading-snug">
                    Оплатите заказ картой в YooKassa — после оплаты статус обновится автоматически.
                  </p>
                  {payError && (
                    <p className="text-[12px] text-brand-error mt-2 font-medium">{payError}</p>
                  )}
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handlePayOnline}
                      loading={payLoading}
                    >
                      Перейти к оплате
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold mb-3">Состав заказа</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-3 bg-white rounded-2xl p-3 shadow-[var(--shadow-card)] border border-transparent hover:border-[var(--border-brand-subtle)]/40 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
                      <svg
                        className="w-5 h-5 text-brand-primary/30"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 22c-.55 0-1-.45-1-1v-3.27c-3.58-.45-6.37-3.24-6.82-6.82L1 11c-.55 0-1-.45-1-1s.45-1 1-1h3.09C4.54 5.58 7.33 2.79 10.91 2.34V1c0-.55.45-1 1-1s1 .45 1 1v1.09c3.58.45 6.37 3.24 6.82 6.82L23 9c.55 0 1 .45 1 1s-.45 1-1 1h-3.27c-.45 3.58-3.24 6.37-6.82 6.82V21c0 .55-.45 1-.91 1z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                  <p className="text-xs text-[var(--tg-hint)]">
                    {item.quantity} × {item.price.toLocaleString("ru-RU")} ₽
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0 self-center">
                  {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold mb-3">Доставка</h2>
          <div className="bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] space-y-2.5 text-sm">
            <InfoRow label="Получатель" value={order.recipient.name} />
            <InfoRow label="Телефон" value={order.recipient.phone} />
            <InfoRow
              label="Адрес"
              value={`${order.address.street}, ${order.address.building}${order.address.apartment ? `, кв. ${order.address.apartment}` : ""}`}
            />
            <InfoRow
              label="Время"
              value={`${new Date(order.deliverySlot.date).toLocaleDateString("ru-RU")}, ${getWindowLabel(order.deliverySlot.window)}`}
            />
            <InfoRow
              label="Оплата"
              value={PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            />
          </div>
        </section>

        {/* Total */}
        <section className="mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--tg-hint)]">Товары</span>
              <span className="font-medium">{order.subtotal.toLocaleString("ru-RU")} ₽</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-success font-medium">Скидка</span>
                <span className="text-brand-success font-medium">
                  -{order.discount.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--tg-hint)]">Доставка</span>
                <span className="font-medium">{order.deliveryFee.toLocaleString("ru-RU")} ₽</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 mt-1">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">Итого</span>
                <span className="text-lg font-bold text-brand-primary">
                  {order.total.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        {timeline.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold mb-3">История</h2>
            <div className="bg-white rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)]">
              <div className="relative pl-7">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full" />
                {timeline.map((entry, i) => (
                  <div
                    key={`${entry.createdAt}-${entry.status}`}
                    className="relative mb-5 last:mb-0"
                  >
                    <div
                      className={`absolute -left-5 top-1 w-[14px] h-[14px] rounded-full border-2 ${
                        i === 0
                          ? "bg-brand-primary border-brand-primary"
                          : "bg-white border-gray-300"
                      }`}
                    />
                    <div>
                      <span className="text-sm font-semibold">
                        {ORDER_STATUS_LABELS[entry.status as OrderStatus] ?? entry.status}
                      </span>
                      {entry.note && (
                        <p className="text-xs text-[var(--tg-hint)] mt-0.5 leading-relaxed">
                          {entry.note}
                        </p>
                      )}
                      <p className="text-[11px] text-[var(--tg-hint)] mt-0.5">
                        {new Date(entry.createdAt).toLocaleString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <Button variant="outline" size="lg" onClick={() => navigate("/")}>
          Продолжить покупки
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--tg-hint)] shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
