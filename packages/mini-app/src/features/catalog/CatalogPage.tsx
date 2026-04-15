import { useState } from "react";
import { useCategories, useProducts } from "@/api/hooks";
import { ProductCard } from "@/design-system/components/ProductCard";

export function CatalogPage() {
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const { categories, loading: catLoading } = useCategories();
  const { products, loading } = useProducts(activeCategory, search || undefined);

  return (
    <div className="pb-6">
      {/* Hero: exaggerated minimalism (big type + lots of air) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary-dark to-[#7a2340] px-5 pt-8 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden>
          <div className="absolute -top-24 left-1/2 h-48 w-[min(100%,24rem)] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-12 right-0 h-36 w-36 rounded-full bg-brand-accent/25 blur-2xl" />
          <div className="absolute bottom-0 left-4 h-28 w-28 rounded-full bg-white/10 blur-xl" />
        </div>
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/[0.06]" />
        <div className="absolute right-6 bottom-2 h-20 w-20 rounded-full bg-white/[0.06]" />

        <h1 className="relative z-10 tracking-[-0.04em] text-balance leading-[1.02]">
          <span className="block text-white text-[clamp(30px,7.2vw,44px)] font-extrabold">
            Цветы
          </span>
          <span className="block text-brand-accent text-[clamp(30px,7.2vw,44px)] font-extrabold">
            Любимого Города
          </span>
        </h1>
        <p className="text-white/80 text-[13px] mt-3 mb-5 relative z-10 leading-relaxed max-w-[28ch]">
          Каменск-Уральский · Доставка от 1 часа
        </p>

        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/12 px-4 py-3 shadow-[var(--shadow-float)] backdrop-blur-md relative z-10">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-accent text-[11px] font-bold text-brand-text shadow-sm">
            %
          </span>
          <span className="text-white text-[13px] font-semibold">–10% на первый заказ</span>
        </div>
      </div>

      <div className="px-4">
        {/* Search */}
        <div className="relative -mt-5 mb-4">
          <input
            type="text"
            placeholder="Найти букет, розы, композицию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3.5 pl-11 bg-white rounded-2xl text-sm outline-none shadow-[var(--shadow-float)] border border-white/40 focus:shadow-[var(--shadow-card-hover)] transition-shadow duration-200 placeholder:text-gray-400"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="Очистить поиск"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Categories */}
        {!catLoading && (
          <div className="sticky top-0 z-[5] -mx-4 px-4 pb-3 bg-gradient-to-b from-[var(--tg-bg)] via-[var(--tg-bg)] to-transparent">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                className={`shrink-0 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-200 ${
                  !activeCategory
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                    : "bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] hover:bg-gray-200"
                }`}
                onClick={() => setActiveCategory(undefined)}
              >
                Все
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`shrink-0 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-200 ${
                    activeCategory === cat.id
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] hover:bg-gray-200"
                  }`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] text-[var(--tg-hint)]">
            {loading ? "Подбираем букеты..." : `${products.length} в каталоге`}
          </p>
          {search && !loading && (
            <button
              className="text-[13px] text-brand-primary font-semibold"
              onClick={() => setSearch("")}
              type="button"
            >
              Сбросить поиск
            </button>
          )}
        </div>

        {/* Products */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-white shadow-[var(--shadow-card)] border border-transparent"
              >
                <div className="aspect-[4/5] bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2.5">
                  <div className="h-3.5 bg-gray-100 rounded-lg animate-pulse w-4/5" />
                  <div className="h-3.5 bg-gray-100 rounded-lg animate-pulse w-3/5" />
                  <div className="h-5 bg-gray-100 rounded-lg animate-pulse w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 animate-fade-in rounded-3xl bg-white/70 border border-[var(--border-brand-subtle)]/40 shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center shadow-inner">
              <svg
                className="w-7 h-7 text-[var(--tg-hint)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <p className="font-semibold text-[var(--tg-text)] mb-1">Ничего не найдено</p>
            <p className="text-sm text-[var(--tg-hint)]">
              Попробуйте другой запрос или переключите категорию
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
