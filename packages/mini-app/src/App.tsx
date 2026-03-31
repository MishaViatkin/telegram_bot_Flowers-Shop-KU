import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { CartProvider } from "@/app/CartProvider";
import { TelegramProvider } from "@/app/TelegramProvider";
import { AdminApp } from "@/features/admin/AdminApp";
import { CartPage } from "@/features/cart/CartPage";
import { CatalogPage } from "@/features/catalog/CatalogPage";
import { CheckoutPage } from "@/features/checkout/CheckoutPage";
import { PaymentReturnPage } from "@/features/checkout/PaymentReturnPage";
import { OrderStatusPage } from "@/features/order-tracking/OrderStatusPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { ProductDetailPage } from "@/features/product/ProductDetailPage";

export function App() {
  return (
    <TelegramProvider>
      <CartProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </CartProvider>
    </TelegramProvider>
  );
}
