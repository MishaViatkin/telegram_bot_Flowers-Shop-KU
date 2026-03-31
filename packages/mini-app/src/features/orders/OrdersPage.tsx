import type { OrderStatus } from "@flowers-tg/shared";
import { ORDER_STATUS_LABELS } from "@flowers-tg/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";

interface OrderSummary {
  id: string;
  status: OrderStatus;
  items: Array<{ title: string; image: string; quantity: number }>;
  total: number;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "success" | "primary" | "error" | "neutral" | "accent"> = {
  draft: "neutral",
  created: "primary",
  confirmed: "accent",
  in_delivery: "primary",
  delivered: "success",
  cancelled: "error",
  failed_payment: "error",
};

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient<{ data: OrderSummary[] }>("/orders")
      .then((res) => {
        if (!cancelled) setOrders(res.data);
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-5 pb-6">
        <h1 className="text-xl font-bold mb-5">Мои заказы</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[88px] bg-white rounded-[var(--radius-card)] animate-pulse shadow-[var(--shadow-card)] border border-transparent"
            />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="px-4 pt-5 pb-6 min-h-[80vh] flex flex-col animate-fade-in">
        <h1 className="text-xl font-bold mb-6">Мои заказы</h1>
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--tg-hint)]">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-brand-error"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[var(--tg-text)] mb-1">Не удалось загрузить</p>
          <p className="text-sm mb-6 text-center">{fetchError}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="px-4 pt-5 pb-6 min-h-[80vh] flex flex-col animate-fade-in">
        <h1 className="text-xl font-bold mb-6">Мои заказы</h1>
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--tg-hint)]">
          <div className="w-24 h-24 bg-[var(--tg-secondary-bg)] rounded-full flex items-center justify-center mb-5">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[var(--tg-text)] mb-1">Пока нет заказов</p>
          <p className="text-sm mb-8 text-center max-w-[250px]">
            Выберите букет и оформите первый заказ
          </p>
          <Button
            variant="primary"
            size="lg"
            className="max-w-[280px]"
            onClick={() => navigate("/")}
          >
            Перейти в каталог
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6 animate-fade-in">
      <h1 className="text-xl font-bold mb-5">Мои заказы</h1>

      <div className="space-y-3">
        {orders.map((order, i) => {
          const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
          const variant = STATUS_VARIANT[order.status] ?? "neutral";
          const firstImage = order.items[0]?.image;
          const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

          return (
            <div
              key={order.id}
              className="bg-white rounded-[var(--radius-card)] p-4 border border-transparent shadow-[var(--shadow-card)] cursor-pointer active:scale-[0.99] transition-all duration-200 hover:border-[var(--border-brand-subtle)] hover:shadow-[var(--shadow-card-hover)] animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => navigate(`/order/${order.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0">
                  {firstImage ? (
                    <img src={firstImage} alt="" className="w-full h-full object-cover" />
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
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--tg-hint)] font-mono">
                      #{order.id.slice(0, 8)}
                    </span>
                    <Badge variant={variant}>{statusLabel}</Badge>
                  </div>
                  <p className="text-sm font-medium line-clamp-1 mb-1">
                    {order.items.map((it) => it.title).join(", ")}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--tg-hint)]">
                      {itemCount} {itemCount === 1 ? "товар" : itemCount < 5 ? "товара" : "товаров"}{" "}
                      ·{" "}
                      {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="text-sm font-bold text-brand-primary">
                      {order.total.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
