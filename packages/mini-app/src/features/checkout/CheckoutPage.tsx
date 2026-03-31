import { DELIVERY_WINDOW_LABELS, DELIVERY_WINDOWS } from "@flowers-tg/shared";
import { type Dispatch, type SetStateAction, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { useCart } from "@/app/CartProvider";
import { Button } from "@/design-system/components/Button";

const PAYMENT_METHODS = [
  { id: "cash", label: "Наличными курьеру", icon: "cash" },
  { id: "transfer", label: "Перевод на карту", icon: "card" },
  { id: "card_online", label: "Онлайн оплата", icon: "online" },
] as const;

const PaymentIcon = ({ type }: { type: string }) => {
  if (type === "cash")
    return (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
        />
      </svg>
    );
  if (type === "card")
    return (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
        />
      </svg>
    );
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getNext7Days(): Array<{ date: string; label: string }> {
  const days: Array<{ date: string; label: string }> = [];
  const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const months = [
    "янв",
    "фев",
    "мар",
    "апр",
    "мая",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label =
      i === 0
        ? "Сегодня"
        : i === 1
          ? "Завтра"
          : `${weekDays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    days.push({ date: formatDate(d), label });
  }
  return days;
}

interface FormField {
  label: string;
  key: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  halfWidth?: boolean;
}

const RECIPIENT_FIELDS: FormField[] = [
  { label: "Имя получателя", key: "name", placeholder: "Иван Иванов", required: true },
  { label: "Телефон", key: "phone", placeholder: "+79001234567", type: "tel", required: true },
];

const ADDRESS_FIELDS: FormField[] = [
  { label: "Улица", key: "street", placeholder: "ул. Ленина", required: true },
  { label: "Дом", key: "building", placeholder: "12а", required: true, halfWidth: true },
  { label: "Квартира", key: "apartment", placeholder: "45", halfWidth: true },
  { label: "Подъезд", key: "entrance", placeholder: "2", halfWidth: true },
  { label: "Этаж", key: "floor", placeholder: "3", halfWidth: true },
  { label: "Комментарий курьеру", key: "comment", placeholder: "Домофон не работает, позвонить" },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, loading: cartLoading, refresh } = useCart();

  const [recipient, setRecipient] = useState({ name: "", phone: "" });
  const [address, setAddress] = useState({
    street: "",
    building: "",
    apartment: "",
    entrance: "",
    floor: "",
    comment: "",
  });
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedWindow, setSelectedWindow] = useState("asap");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [orderComment, setOrderComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = getNext7Days();
  const windows = DELIVERY_WINDOWS.map((w) => ({ value: w, label: DELIVERY_WINDOW_LABELS[w] }));

  const items = cart?.items ?? [];

  if (cartLoading) {
    return (
      <div className="px-4 pt-5 pb-6">
        <h1 className="text-xl font-bold mb-6">Оформление заказа</h1>
        <div className="space-y-4 animate-pulse">
          <div className="h-14 bg-gray-100 rounded-2xl" />
          <div className="h-14 bg-gray-100 rounded-2xl" />
          <div className="h-36 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 pt-5 pb-6 text-center animate-fade-in">
        <h1 className="text-xl font-bold mb-6">Оформление заказа</h1>
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center">
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
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium mb-2 text-[var(--tg-hint)]">Корзина пуста</p>
        <Button variant="primary" onClick={() => navigate("/")}>
          К каталогу
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!recipient.name.trim() || !recipient.phone.trim()) {
      setError("Укажите имя и телефон получателя");
      return;
    }
    if (!address.street.trim() || !address.building.trim()) {
      setError("Укажите улицу и номер дома");
      return;
    }
    const phoneClean = recipient.phone.replace(/[\s\-()]/g, "");
    if (!/^\+7\d{10}$/.test(phoneClean)) {
      setError("Формат телефона: +79001234567");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = {
        recipient: { name: recipient.name.trim(), phone: phoneClean },
        address: {
          street: address.street.trim(),
          building: address.building.trim(),
          ...(address.apartment ? { apartment: address.apartment.trim() } : {}),
          ...(address.entrance ? { entrance: address.entrance.trim() } : {}),
          ...(address.floor ? { floor: address.floor.trim() } : {}),
          ...(address.comment ? { comment: address.comment.trim() } : {}),
        },
        deliverySlot: { date: selectedDate, window: selectedWindow },
        paymentMethod,
        ...(orderComment.trim() ? { comment: orderComment.trim() } : {}),
        ...(cart?.promoCode ? { promoCode: cart.promoCode } : {}),
      };

      await apiClient<{ data: { valid: boolean } }>("/orders/validate", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const res = await apiClient<{ data: { id: string } }>("/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (paymentMethod === "card_online") {
        const payRes = await apiClient<{ data: { confirmationUrl: string } }>("/payments", {
          method: "POST",
          body: JSON.stringify({ orderId: res.data.id }),
        });
        const payUrl = payRes.data.confirmationUrl;
        if (window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(payUrl);
        } else {
          window.location.assign(payUrl);
        }
        setSubmitting(false);
        return;
      }

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
      }

      await refresh();
      navigate(`/order/${res.data.id}`, { replace: true });
    } catch (err) {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
      }
      setError((err as Error).message || "Не удалось оформить заказ");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (
    field: FormField,
    values: Record<string, string>,
    setter: Dispatch<SetStateAction<Record<string, string>>>,
  ) => (
    <div key={field.key} className={field.halfWidth ? "flex-1 min-w-[calc(50%-4px)]" : "w-full"}>
      <label className="block text-xs text-[var(--tg-hint)] mb-1.5 ml-0.5 font-medium">
        {field.label}
      </label>
      <input
        type={field.type || "text"}
        placeholder={field.placeholder}
        value={values[field.key] || ""}
        onChange={(e) => setter((prev) => ({ ...prev, [field.key]: e.target.value }))}
        className="w-full px-4 py-3 bg-[var(--tg-secondary-bg)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 transition-shadow placeholder:text-gray-400"
      />
    </div>
  );

  return (
    <div className="px-4 pt-5 pb-6 animate-fade-in">
      <h1 className="text-xl font-bold mb-6">Оформление заказа</h1>

      {/* Recipient */}
      <section className="mb-6">
        <SectionHeader step={1} title="Получатель" />
        <div className="space-y-3">
          {RECIPIENT_FIELDS.map((f) =>
            renderField(
              f,
              recipient,
              setRecipient as Dispatch<SetStateAction<Record<string, string>>>,
            ),
          )}
        </div>
      </section>

      {/* Address */}
      <section className="mb-6">
        <SectionHeader step={2} title="Адрес доставки" />
        <div className="flex flex-wrap gap-3">
          {ADDRESS_FIELDS.map((f) =>
            renderField(f, address, setAddress as Dispatch<SetStateAction<Record<string, string>>>),
          )}
        </div>
      </section>

      {/* Delivery slot */}
      <section className="mb-6">
        <SectionHeader step={3} title="Время доставки" />
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-3">
          {days.map((d) => (
            <button
              key={d.date}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                selectedDate === d.date
                  ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                  : "bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] hover:bg-gray-200"
              }`}
              onClick={() => setSelectedDate(d.date)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {windows.map((w) => (
            <button
              key={w.value}
              className={`px-3 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                selectedWindow === w.value
                  ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                  : "bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] hover:bg-gray-200"
              }`}
              onClick={() => setSelectedWindow(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      {/* Payment */}
      <section className="mb-6">
        <SectionHeader step={4} title="Способ оплаты" />
        <div className="space-y-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                paymentMethod === m.id
                  ? "bg-brand-primary/8 border-2 border-brand-primary"
                  : "bg-[var(--tg-secondary-bg)] border-2 border-transparent hover:bg-gray-200"
              }`}
              onClick={() => setPaymentMethod(m.id)}
            >
              <div className={`${paymentMethod === m.id ? "text-brand-primary" : "text-gray-500"}`}>
                <PaymentIcon type={m.icon} />
              </div>
              <span className="text-sm font-medium flex-1 text-left">{m.label}</span>
              {paymentMethod === m.id && (
                <svg
                  className="w-5 h-5 text-brand-primary shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Comment */}
      <section className="mb-6">
        <label className="block text-xs text-[var(--tg-hint)] mb-1.5 ml-0.5 font-medium">
          Комментарий к заказу
        </label>
        <textarea
          placeholder="Пожелания по букету, открытка..."
          value={orderComment}
          onChange={(e) => setOrderComment(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 bg-[var(--tg-secondary-bg)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 transition-shadow resize-none placeholder:text-gray-400"
        />
      </section>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 mb-5 shadow-[var(--shadow-card)]">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--tg-hint)]">Товары</span>
            <span className="font-medium">{cart?.subtotal?.toLocaleString("ru-RU")} ₽</span>
          </div>
          {(cart?.discount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-brand-success font-medium">Скидка</span>
              <span className="text-brand-success font-medium">
                -{(cart?.discount ?? 0).toLocaleString("ru-RU")} ₽
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-[var(--tg-hint)]">Доставка</span>
            <span className="text-brand-success font-medium">Бесплатно</span>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-1">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold">К оплате</span>
              <span className="text-xl font-bold text-brand-primary">
                {cart?.total?.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-brand-error text-sm px-4 py-3 rounded-2xl mb-4 font-medium animate-fade-in">
          {error}
        </div>
      )}

      <Button variant="primary" size="lg" onClick={handleSubmit} loading={submitting}>
        Подтвердить заказ
      </Button>
    </div>
  );
}

function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2.5">
      <span className="w-6 h-6 bg-brand-primary text-white text-[11px] flex items-center justify-center rounded-lg font-bold">
        {step}
      </span>
      {title}
    </h2>
  );
}
