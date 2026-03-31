import type { OrderStatus } from "@flowers-tg/shared";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@flowers-tg/shared";
import { useCallback, useEffect, useState } from "react";
import { adminData } from "@/api/admin-client";

type AdminUser = {
  id: string;
  firstName: string;
  telegramId: number;
};

type AdminOrder = {
  id: string;
  userId: string;
  status: string;
  total: number;
  createdAt: string;
  user: AdminUser | null;
};

export function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminData<{ items: AdminOrder[]; total: number }>("/orders?limit=100");
      setItems(data.items);
      setTotal(data.total);
      setPendingStatus({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyStatus = async (orderId: string) => {
    const next = pendingStatus[orderId];
    if (!next?.trim()) return;
    setSavingId(orderId);
    setError(null);
    try {
      await adminData(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, note: "admin" }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const allowedNext = (status: string): OrderStatus[] => {
    if (!Object.hasOwn(ORDER_STATUS_FLOW, status)) return [];
    return ORDER_STATUS_FLOW[status as OrderStatus];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold">Заказы</h1>
        <span className="text-sm text-gray-500">Всего: {total}</span>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-500">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Заказов нет</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Клиент</th>
                <th className="px-3 py-2 font-medium">Сумма</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => {
                const nextOptions = allowedNext(o.status);
                const pending = pendingStatus[o.id] ?? "";
                return (
                  <tr key={o.id} className="border-t border-white/10">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">
                      {new Date(o.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-3 py-2">
                      {o.user ? (
                        <span>
                          {o.user.firstName}
                          <span className="text-gray-500"> · tg:{o.user.telegramId}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500">{o.userId}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {o.total.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-gray-400">
                        {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {nextOptions.length === 0 ? (
                        <span className="text-gray-600">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={pending}
                            onChange={(e) =>
                              setPendingStatus((prev) => ({ ...prev, [o.id]: e.target.value }))
                            }
                            className="rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs max-w-[180px]"
                          >
                            <option value="">— новый статус —</option>
                            {nextOptions.map((s) => (
                              <option key={s} value={s}>
                                {ORDER_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={savingId === o.id || !pending}
                            onClick={() => applyStatus(o.id)}
                            className="rounded-lg bg-brand-primary/90 text-white text-xs px-3 py-1.5 disabled:opacity-40"
                          >
                            {savingId === o.id ? "…" : "OK"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
