import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAdminSecret } from "@/api/admin-client";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    clearAdminSecret();
    navigate("/admin/login", { replace: true });
  };

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#121218] text-gray-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#121218]/92 backdrop-blur px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 leading-none">Админка</p>
            <p className="font-bold text-brand-primary leading-tight truncate">
              Цветы Любимого Города
            </p>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive("/admin/orders")
                  ? "bg-white/10 text-white"
                  : "text-gray-300 hover:bg-white/5"
              }`}
              to="/admin/orders"
            >
              Заказы
            </Link>
            <Link
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive("/admin/products")
                  ? "bg-white/10 text-white"
                  : "text-gray-300 hover:bg-white/5"
              }`}
              to="/admin/products"
            >
              Товары
            </Link>
            <button
              type="button"
              onClick={logout}
              className="ml-1 px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors"
            >
              Выйти
            </button>
          </nav>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto pb-16">
        <Outlet />
      </main>
    </div>
  );
}
