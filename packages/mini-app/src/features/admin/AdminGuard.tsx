import { Navigate, Outlet } from "react-router-dom";
import { getAdminSecret } from "@/api/admin-client";

export function AdminGuard() {
  if (!getAdminSecret()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
