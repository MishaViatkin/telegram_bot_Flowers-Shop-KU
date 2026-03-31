import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { CartProvider } from "@/app/CartProvider";
import { TelegramProvider } from "@/app/TelegramProvider";

const AdminApp = lazy(() =>
  import("@/features/admin/AdminApp").then((m) => ({ default: m.AdminApp })),
);
const CartPage = lazy(() =>
  import("@/features/cart/CartPage").then((m) => ({ default: m.CartPage })),
);
const CatalogPage = lazy(() =>
  import("@/features/catalog/CatalogPage").then((m) => ({ default: m.CatalogPage })),
);
const CheckoutPage = lazy(() =>
  import("@/features/checkout/CheckoutPage").then((m) => ({ default: m.CheckoutPage })),
);
const PaymentReturnPage = lazy(() =>
  import("@/features/checkout/PaymentReturnPage").then((m) => ({ default: m.PaymentReturnPage })),
);
const OrderStatusPage = lazy(() =>
  import("@/features/order-tracking/OrderStatusPage").then((m) => ({ default: m.OrderStatusPage })),
);
const OrdersPage = lazy(() =>
  import("@/features/orders/OrdersPage").then((m) => ({ default: m.OrdersPage })),
);
const ProductDetailPage = lazy(() =>
  import("@/features/product/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })),
);

export function App() {
  return (
    <TelegramProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen page-canvas" />}>
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />
              <Route element={<AppShell />}>
                <Route index element={<CatalogPage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/payment/return" element={<PaymentReturnPage />} />
                <Route path="/order/:id" element={<OrderStatusPage />} />
                <Route path="/orders" element={<OrdersPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </TelegramProvider>
  );
}
