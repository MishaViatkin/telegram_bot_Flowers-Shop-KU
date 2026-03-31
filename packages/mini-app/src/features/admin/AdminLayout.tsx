import { Link, Outlet, useNavigate } from "react-router-dom";
import { clearAdminSecret } from "@/api/admin-client";

export function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    clearAdminSecret();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#121218] text-gray-100">
      <header className="border-b border-white/10 px-4 py-3 flex flex-wrap justify-between items-center gap-2">
        <span className="font-bold text-brand-primary">Админка · Цветы ЛГ</span>
        <nav className="flex flex-wrap gap-4 text-sm items-center">
          <Link className="text-brand-primary hover:underline" to="/admin/orders">
            Заказы
          </Link>
          <Link className="text-brand-primary hover:underline" to="/admin/products">
            Товары
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Выйти
          </button>
        </nav>
      </header>
      <main className="p-4 max-w-6xl mx-auto pb-16">
        <Outlet />
      </main>
    </div>
  );
}
