const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const STORAGE_KEY = "flowers_admin_secret";

export function getAdminSecret(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminSecret(secret: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, secret);
  } catch {
    /* ignore */
  }
}

export function clearAdminSecret() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const secret = getAdminSecret();
  if (!secret) {
    throw new Error("Нет ключа админки");
  }
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    "X-Admin-Secret": secret,
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${BASE_URL}/api/admin${path}`, { ...init, headers });
}

export async function adminData<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    error?: { message?: string };
    data?: T;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error?.message || `Ошибка ${res.status}`);
  }
  if (body?.success === true && body.data !== undefined) {
    return body.data;
  }
  throw new Error("Некорректный ответ API");
}
