import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { adminFetch, clearAdminSecret, getAdminSecret, setAdminSecret } from "@/api/admin-client";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (getAdminSecret()) {
    return <Navigate to="/admin/orders" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = secret.trim();
    if (!trimmed) {
      setError("Введите секретный ключ");
      return;
    }
    setLoading(true);
    setAdminSecret(trimmed);
    try {
      const res = await adminFetch("/orders?limit=1");
      if (!res.ok) {
        clearAdminSecret();
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message || "Неверный ключ");
        return;
      }
      navigate("/admin/orders", { replace: true });
    } catch {
      clearAdminSecret();
      setError("Не удалось связаться с API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121218] text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <h1 className="text-xl font-bold text-brand-primary mb-2">Вход в админку</h1>
        <p className="text-sm text-gray-400 mb-6">
          Ключ задаётся на сервере в <code className="text-gray-300">ADMIN_API_SECRET</code>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Секретный ключ</label>
            <input
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-primary text-white font-semibold py-3 disabled:opacity-50"
          >
            {loading ? "Проверка…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
