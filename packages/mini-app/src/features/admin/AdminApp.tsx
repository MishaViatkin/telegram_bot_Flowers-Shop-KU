import { Navigate, Route, Routes } from "react-router-dom";
import { getAdminSecret } from "@/api/admin-client";
import { AdminGuard } from "./AdminGuard";
import { AdminLayout } from "./AdminLayout";
import { AdminLoginPage } from "./AdminLoginPage";
import { AdminOrdersPage } from "./AdminOrdersPage";
import { AdminProductsPage } from "./AdminProductsPage";

function AdminEntry() {
  return getAdminSecret() ? <Navigate to="orders" replace /> : <Navigate to="login" replace />;
}

export function AdminApp() {
  return (
    <Routes>
      <Route index element={<AdminEntry />} />
      <Route path="login" element={<AdminLoginPage />} />
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="products" element={<AdminProductsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
