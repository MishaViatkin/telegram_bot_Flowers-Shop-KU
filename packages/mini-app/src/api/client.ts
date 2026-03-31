const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

let _userId = `dev-${Date.now().toString(36)}`;
let _initData = "";

export function setUserId(id: string) {
  _userId = id;
}

export function getUserId(): string {
  return _userId;
}

export function setInitData(data: string) {
  _initData = data;
}

export function getInitData(): string {
  return _initData;
}

function parseErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const err = o.error;
    if (err && typeof err === "object" && err !== null) {
      const msg = (err as Record<string, unknown>).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    const msg = o.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return `Ошибка запроса (${status})`;
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (_initData) {
    headers["X-Init-Data"] = _initData;
  } else {
    headers["X-User-Id"] = _userId;
  }

  const response = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body, response.status));
  }

  return response.json();
}
