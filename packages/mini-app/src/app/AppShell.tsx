import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useReferralAttribution } from "@/hooks/useReferralAttribution";
import { useCart } from "./CartProvider";
import { deepLinkToPath, parseStartParam } from "./deep-link";
import { useTelegram } from "./TelegramProvider";

export function AppShell() {
  useReferralAttribution();
  const { webApp, startParam, isReady } = useTelegram();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isReady) return;
    const route = parseStartParam(startParam);
    const path = deepLinkToPath(route);
    if (path !== "/" && location.pathname === "/") {
      navigate(path, { replace: true });
    }
  }, [isReady, startParam, location.pathname, navigate]);

  useEffect(() => {
    if (!webApp) return;
    const showBack = location.pathname !== "/";
    if (showBack) {
      webApp.BackButton.show();
    } else {
      webApp.BackButton.hide();
    }
    const handleBack = () => navigate(-1);
    webApp.BackButton.onClick(handleBack);
    return () => webApp.BackButton.offClick(handleBack);
  }, [webApp, location.pathname, navigate]);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-10 h-10 border-3 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
        <span className="text-brand-primary text-sm font-medium animate-pulse">Загрузка...</span>
      </div>
    );
  }

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div
      className="min-h-screen page-canvas"
      style={{ paddingBottom: "calc(72px + var(--safe-area-bottom))" }}
    >
      <Outlet />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 nav-bottom-glass bg-[var(--tg-bg)]/92"
        style={{ paddingBottom: "var(--safe-area-bottom)" }}
      >
        <div className="flex justify-around items-center h-[64px] max-w-md mx-auto">
          <NavItem
            to="/"
            label="Каталог"
            active={
              isActive("/") &&
              !isActive("/cart") &&
              !isActive("/orders") &&
              !isActive("/order/") &&
              !isActive("/checkout")
            }
            icon={
              <svg
                className="w-[22px] h-[22px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
                />
              </svg>
            }
          />

          <NavItem
            to="/cart"
            label="Корзина"
            active={isActive("/cart") || isActive("/checkout")}
            badge={itemCount}
            icon={
              <svg
                className="w-[22px] h-[22px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            }
          />

          <NavItem
            to="/orders"
            label="Заказы"
            active={isActive("/orders") || isActive("/order/")}
            icon={
              <svg
                className="w-[22px] h-[22px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            }
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  active,
  badge,
  icon,
}: {
  to: string;
  label: string;
  active: boolean;
  badge?: number;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 min-w-[72px] py-1.5 transition-colors duration-200 ${
        active ? "text-brand-primary" : "text-[var(--tg-hint)]"
      }`}
      aria-label={label}
    >
      <div className="relative">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] flex items-center justify-center bg-brand-accent text-brand-text text-[9px] font-bold rounded-full px-1 leading-none shadow-sm">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
    </Link>
  );
}
