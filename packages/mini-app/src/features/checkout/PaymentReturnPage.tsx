import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Button } from "@/design-system/components/Button";

type Phase = "loading" | "paid" | "failed" | "timeout" | "error";

export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    if (!orderId) {
      setPhase("error");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 24;

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          const res = await apiClient<{ data: { status: string } }>(`/orders/${orderId}`);
          const status = res.data.status;
          if (status === "confirmed") {
            setPhase("paid");
            setTimeout(() => navigate(`/order/${orderId}`, { replace: true }), 800);
            return;
          }
          if (status === "failed_payment") {
            setPhase("failed");
            return;
          }
        } catch {
          if (!cancelled) setPhase("error");
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (!cancelled) setPhase("timeout");
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, navigate]);

  if (!orderId) {
    return (
      <div className="px-4 pt-8 pb-10 text-center">
        <p className="text-brand-error font-medium mb-4">Не указан заказ</p>
        <Button variant="primary" onClick={() => navigate("/orders")}>
          К заказам
        </Button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="px-4 pt-10 pb-10 text-center animate-fade-in">
        <div className="w-14 h-14 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-lg font-bold mb-2">Проверяем оплату…</h1>
        <p className="text-sm text-[var(--tg-hint)]">Обычно это занимает несколько секунд</p>
      </div>
    );
  }

  if (phase === "paid") {
    return (
      <div className="px-4 pt-10 pb-10 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-lg font-bold mb-2">Оплата прошла</h1>
        <p className="text-sm text-[var(--tg-hint)]">Переходим к заказу…</p>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="px-4 pt-10 pb-10 text-center animate-fade-in">
        <h1 className="text-lg font-bold mb-2 text-brand-error">Оплата не завершена</h1>
        <p className="text-sm text-[var(--tg-hint)] mb-6">
          Заказ отменён. Вы можете оформить новый в каталоге.
        </p>
        <Button variant="primary" onClick={() => navigate("/")}>
          В каталог
        </Button>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="px-4 pt-10 pb-10 text-center animate-fade-in">
        <h1 className="text-lg font-bold mb-2">Статус уточняется</h1>
        <p className="text-sm text-[var(--tg-hint)] mb-6">
          Если списание прошло, заказ скоро отобразится как оплаченный. Проверьте раздел «Заказы».
        </p>
        <Button variant="primary" onClick={() => navigate(`/order/${orderId}`)}>
          К заказу
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-10 pb-10 text-center animate-fade-in">
      <p className="text-brand-error font-medium mb-4">Не удалось загрузить статус</p>
      <Button variant="primary" onClick={() => navigate("/orders")}>
        К заказам
      </Button>
    </div>
  );
}
