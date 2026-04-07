import type { CartItem } from "@flowers-tg/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/app/CartProvider";
import { Button } from "@/design-system/components/Button";

function QuantityControl({
  quantity,
  onChange,
  disabled,
}: {
  quantity: number;
  onChange: (q: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center bg-[var(--tg-secondary-bg)] rounded-xl overflow-hidden ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <button
        className="w-9 h-9 flex items-center justify-center text-base font-medium text-[var(--tg-text)] active:bg-gray-200/80 transition-colors"
        onClick={() => onChange(quantity - 1)}
        aria-label="Уменьшить количество"
        disabled={disabled}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
      <button
        className="w-9 h-9 flex items-center justify-center text-base font-medium text-brand-primary active:bg-brand-primary/10 transition-colors"
        onClick={() => onChange(quantity + 1)}
        aria-label="Увеличить количество"
        disabled={disabled}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

export function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, error, updateQuantity, removeItem, clearCart, applyPromo } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Record<string, true>>({});

  const setPending = (productId: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = { ...prev };
      if (pending) next[productId] = true;
      else delete next[productId];
      return next;
    });
  };

  const handleQuantityChange = async (productId: string, newQty: number) => {
    if (pendingIds[productId]) return;
    setPending(productId, true);
    setMutationError(null);
    const result =
      newQty <= 0 ? await removeItem(productId) : await updateQuantity(productId, newQty);
    if (result.error) setMutationError(result.error);
    setPending(productId, false);
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    const result = await applyPromo(promoInput.trim());
    if (result.error) {
      setPromoError(result.error);
    } else {
      setPromoInput("");
    }
    setPromoLoading(false);
  };

  const handleClear = async () => {
    setClearing(true);
    await clearCart();
    setClearing(false);
  };

  if (loading) {
    return (
      <div className="px-4 pt-5 pb-6">
        <h1 className="text-xl font-bold mb-5">Корзина</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-3 animate-pulse bg-white rounded-[var(--radius-card)] p-3 shadow-[var(--shadow-card)] border border-transparent"
            >
              <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                <div className="h-4 bg-gray-100 rounded-lg w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items: CartItem[] = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="px-4 pt-5 pb-6 min-h-[80vh] flex flex-col animate-fade-in">
        <h1 className="text-xl font-bold mb-6">Корзина</h1>
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
                d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[var(--tg-text)] mb-1">
            {error ? "Недоступно" : "Корзина пуста"}
          </p>
          <p className="text-sm mb-8 text-center max-w-[280px] leading-relaxed">
            {error ?? "Выберите букет из каталога — мы доставим его за 1 час"}
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Корзина</h1>
        <button
          className="text-sm text-[var(--tg-hint)] hover:text-brand-error transition-colors font-medium"
          onClick={handleClear}
          disabled={clearing}
        >
          {clearing ? "Очистка..." : "Очистить"}
        </button>
      </div>

      <div className="space-y-3 mb-5">
        {items.map((item: CartItem, i: number) => (
          <div
            key={item.productId}
            className="flex gap-3 bg-white rounded-[var(--radius-card)] p-3 border border-transparent shadow-[var(--shadow-card)] transition-all duration-200 hover:border-[var(--border-brand-subtle)] hover:shadow-[var(--shadow-card-hover)] animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div
              className="w-20 h-20 rounded-xl bg-gray-50 overflow-hidden shrink-0 cursor-pointer"
              onClick={() => navigate(`/product/${item.productId}`)}
            >
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
                  <svg
                    className="w-6 h-6 text-brand-primary/30"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 22c-.55 0-1-.45-1-1v-3.27c-3.58-.45-6.37-3.24-6.82-6.82L1 11c-.55 0-1-.45-1-1s.45-1 1-1h3.09C4.54 5.58 7.33 2.79 10.91 2.34V1c0-.55.45-1 1-1s1 .45 1 1v1.09c3.58.45 6.37 3.24 6.82 6.82L23 9c.55 0 1 .45 1 1s-.45 1-1 1h-3.27c-.45 3.58-3.24 6.37-6.82 6.82V21c0 .55-.45 1-.91 1z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight line-clamp-2 mb-1">{item.title}</p>
              <p className="text-brand-primary font-bold text-sm mb-2">
                {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                {item.quantity > 1 && (
                  <span className="text-[var(--tg-hint)] font-normal text-xs ml-1">
                    ({item.price.toLocaleString("ru-RU")} ₽ × {item.quantity})
                  </span>
                )}
              </p>

              <div className="flex items-center justify-between">
                <QuantityControl
                  quantity={item.quantity}
                  onChange={(q) => handleQuantityChange(item.productId, q)}
                  disabled={pendingIds[item.productId]}
                />
                <button
                  className="text-gray-400 hover:text-brand-error p-1.5 transition-colors"
                  aria-label="Удалить товар"
                  disabled={pendingIds[item.productId]}
                  onClick={async () => {
                    if (pendingIds[item.productId]) return;
                    setPending(item.productId, true);
                    setMutationError(null);
                    const r = await removeItem(item.productId);
                    if (r.error) setMutationError(r.error);
                    setPending(item.productId, false);
                  }}
                >
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
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mutationError && (
        <div className="bg-red-50 text-brand-error text-sm px-4 py-3 rounded-2xl mb-4 font-medium">
          {mutationError}
        </div>
      )}

      {/* Promo */}
      <div className="mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Промокод"
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value.toUpperCase());
              setPromoError(null);
            }}
            className="flex-1 px-4 py-3 bg-[var(--tg-secondary-bg)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 transition-shadow"
          />
          <Button
            variant="outline"
            size="md"
            onClick={handleApplyPromo}
            loading={promoLoading}
            disabled={!promoInput.trim()}
          >
            Применить
          </Button>
        </div>
        {promoError && (
          <p className="text-brand-error text-xs mt-2 ml-1 font-medium">{promoError}</p>
        )}
        {cart?.promoCode && (
          <div className="flex items-center gap-1.5 mt-2 ml-1">
            <svg className="w-3.5 h-3.5 text-brand-success" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-brand-success text-xs font-medium">
              Промокод «{cart.promoCode}» применён
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-[var(--radius-card)] p-4 mb-5 border border-[var(--border-brand-subtle)]/40 shadow-[var(--shadow-float)]">
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--tg-hint)]">
              {items.length}{" "}
              {items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"}
            </span>
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
              <span className="font-semibold">Итого</span>
              <span className="text-xl font-bold text-brand-primary">
                {cart?.total?.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>
        </div>
      </div>

      <Button variant="primary" size="lg" onClick={() => navigate("/checkout")}>
        Оформить заказ
      </Button>
    </div>
  );
}
