import type { Product } from "@flowers-tg/shared";
import { useCallback, useEffect, useState } from "react";
import { adminData } from "@/api/admin-client";

function ProductRow({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [stock, setStock] = useState(product.stock);
  const [active, setActive] = useState(product.active);
  const [price, setPrice] = useState(product.price);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStock(product.stock);
    setActive(product.active);
    setPrice(product.price);
  }, [product.stock, product.active, product.price]);

  const dirty = stock !== product.stock || active !== product.active || price !== product.price;

  const save = async () => {
    if (!dirty) return;
    const payload: Record<string, number | boolean> = {};
    if (stock !== product.stock) payload.stock = stock;
    if (active !== product.active) payload.active = active;
    if (price !== product.price) payload.price = price;
    if (Object.keys(payload).length === 0) return;

    setSaving(true);
    try {
      await adminData(`/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-white/10">
      <td className="px-3 py-2 max-w-[200px]">
        <div className="font-medium line-clamp-2">{product.title}</div>
        <div className="text-[10px] text-gray-500 truncate">{product.id}</div>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          className="w-20 rounded-lg bg-black/40 border border-white/15 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={1}
          step={1}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-24 rounded-lg bg-black/40 border border-white/15 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded border-white/30"
          />
          <span className="text-xs text-gray-400">в витрине</span>
        </label>
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          className="rounded-lg bg-brand-primary/90 text-white text-xs px-3 py-1.5 disabled:opacity-40"
        >
          {saving ? "…" : "Сохранить"}
        </button>
      </td>
    </tr>
  );
}

export function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (query.trim()) params.set("search", query.trim());
      const data = await adminData<{ items: Product[]; total: number }>(`/products?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <h1 className="text-lg font-bold">Товары</h1>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search);
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию"
            className="rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm flex-1 min-w-[200px]"
          />
          <button
            type="submit"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Найти
          </button>
        </form>
      </div>
      <p className="text-sm text-gray-500 mb-4">В каталоге: {total} позиций</p>

      {error && (
        <p className="text-sm text-red-400 mb-4 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-500">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Ничего не найдено</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-3 py-2 font-medium">Товар</th>
                <th className="px-3 py-2 font-medium">Остаток</th>
                <th className="px-3 py-2 font-medium">Цена ₽</th>
                <th className="px-3 py-2 font-medium">Активен</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <ProductRow key={p.id} product={p} onSaved={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
