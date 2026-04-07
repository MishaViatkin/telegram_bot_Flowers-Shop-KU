import type { CartItem, Product } from "@flowers-tg/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/app/CartProvider";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { addItem, cart } = useCart();
  const [adding, setAdding] = useState(false);

  const inCart = cart?.items.some((i: CartItem) => i.productId === product.id) ?? false;

  const originalPrice = product.originalPrice ?? null;
  const hasDiscount = originalPrice !== null && originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / originalPrice) * 100) : 0;

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    await addItem(product.id, 1);
    setAdding(false);
  };

  return (
    <div
      className="group border border-transparent bg-white rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--border-brand-subtle)] hover:shadow-[var(--shadow-card-hover)] cursor-pointer active:scale-[0.985] transition-all duration-200"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
            <svg
              className="w-12 h-12 text-brand-primary/30"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 22c-.55 0-1-.45-1-1v-3.27c-3.58-.45-6.37-3.24-6.82-6.82L1 11c-.55 0-1-.45-1-1s.45-1 1-1h3.09C4.54 5.58 7.33 2.79 10.91 2.34V1c0-.55.45-1 1-1s1 .45 1 1v1.09c3.58.45 6.37 3.24 6.82 6.82L23 9c.55 0 1 .45 1 1s-.45 1-1 1h-3.27c-.45 3.58-3.24 6.37-6.82 6.82V21c0 .55-.45 1-.91 1z" />
            </svg>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 bg-brand-accent text-brand-text text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-sm">
            -{discountPercent}%
          </span>
        )}
      </div>

      <div className="p-3 pb-3.5">
        <h3 className="font-semibold text-[13px] leading-snug line-clamp-2 mb-2 min-h-[2.5em] tracking-[-0.01em]">
          {product.title}
        </h3>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-brand-primary font-extrabold text-[15px] leading-none tracking-[-0.02em]">
              {product.price.toLocaleString("ru-RU")} ₽
            </span>
            {hasDiscount && (
              <span className="text-gray-400 text-[11px] line-through leading-none">
                {originalPrice.toLocaleString("ru-RU")} ₽
              </span>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            aria-label={inCart ? "Уже в корзине" : "Добавить в корзину"}
            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 ${
              inCart
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/18"
            } ${adding ? "opacity-50" : ""}`}
          >
            {inCart ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
