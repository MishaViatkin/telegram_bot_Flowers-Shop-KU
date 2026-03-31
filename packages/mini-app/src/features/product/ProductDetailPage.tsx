import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProduct } from "@/api/hooks";
import { useCart } from "@/app/CartProvider";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { ShareProductButton } from "./ShareProductButton";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(id ?? "");
  const { addItem, cart } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cartItem = cart?.items.find((i) => i.productId === id);

  const handleAddToCart = async () => {
    if (!product || adding) return;
    setAdding(true);
    const result = await addItem(product.id, 1);
    setAdding(false);
    if (!result.error) {
      setAdded(true);
      timerRef.current = setTimeout(() => setAdded(false), 2000);
    }
  };

  if (!id || (error && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-[var(--tg-hint)] px-6 animate-fade-in">
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
        <p className="font-semibold text-[var(--tg-text)] mb-1">Товар не найден</p>
        <p className="text-sm mb-6">Возможно, он уже распродан</p>
        <Button variant="primary" onClick={() => navigate("/")}>
          К каталогу
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="w-full aspect-square bg-gray-100" />
        <div className="p-5 space-y-3">
          <div className="h-6 bg-gray-100 rounded-xl w-3/4" />
          <div className="h-8 bg-gray-100 rounded-xl w-2/5" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-100 rounded-full w-20" />
            <div className="h-6 bg-gray-100 rounded-full w-28" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const originalPrice = product.originalPrice ?? null;
  const hasDiscount = originalPrice !== null && originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / originalPrice) * 100) : 0;

  return (
    <div className="pb-6 animate-fade-in">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
            <svg
              className="w-20 h-20 text-brand-primary/20"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 22c-.55 0-1-.45-1-1v-3.27c-3.58-.45-6.37-3.24-6.82-6.82L1 11c-.55 0-1-.45-1-1s.45-1 1-1h3.09C4.54 5.58 7.33 2.79 10.91 2.34V1c0-.55.45-1 1-1s1 .45 1 1v1.09c3.58.45 6.37 3.24 6.82 6.82L23 9c.55 0 1 .45 1 1s-.45 1-1 1h-3.27c-.45 3.58-3.24 6.37-6.82 6.82V21c0 .55-.45 1-.91 1z" />
            </svg>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-4 left-4 bg-brand-accent text-brand-text text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg">
            -{discountPercent}%
          </span>
        )}
      </div>

      <div className="px-5 pt-5">
        <h1 className="text-xl font-bold leading-tight mb-2.5">{product.title}</h1>

        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-2xl font-bold text-brand-primary">
            {product.price.toLocaleString("ru-RU")} ₽
          </span>
          {hasDiscount && (
            <span className="text-base text-gray-400 line-through">
              {originalPrice.toLocaleString("ru-RU")} ₽
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {product.stock > 0 ? (
            <Badge variant="success" size="md">
              В наличии
            </Badge>
          ) : (
            <Badge variant="error" size="md">
              Нет в наличии
            </Badge>
          )}
          <Badge variant="neutral" size="md">
            Доставка по городу
          </Badge>
        </div>

        <p className="text-sm text-[var(--tg-hint)] leading-relaxed mb-5">{product.description}</p>

        {product.composition && (
          <div className="p-4 bg-[var(--tg-secondary-bg)] rounded-[var(--radius-card)] mb-4 border border-[var(--border-brand-subtle)]/20 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold">Состав букета</p>
            </div>
            <p className="text-sm text-[var(--tg-hint)] leading-relaxed">{product.composition}</p>
          </div>
        )}

        <div className="p-4 bg-[var(--tg-secondary-bg)] rounded-[var(--radius-card)] mb-6 border border-[var(--border-brand-subtle)]/20 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold">Доставка</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-[var(--tg-hint)]">По всему Каменску-Уральскому от 1 часа</p>
            <p className="text-sm text-[var(--tg-hint)]">
              Бесплатная доставка при заказе от 3 000 ₽
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border-brand-subtle)]/25 space-y-3">
          {cartItem ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate("/cart")}
            >
              В корзине ({cartItem.quantity}) — перейти
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full shadow-[var(--shadow-card-hover)]"
              loading={adding}
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {added ? "Добавлено!" : `В корзину · ${product.price.toLocaleString("ru-RU")} ₽`}
            </Button>
          )}
          <ShareProductButton product={product} />
        </div>
      </div>
    </div>
  );
}
