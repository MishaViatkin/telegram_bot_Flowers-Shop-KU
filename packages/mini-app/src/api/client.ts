const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

let _userId = `dev-${Date.now().toString(36)}`;
let _initData = "";

const DEFAULT_TIMEOUT_MS = 12_000;

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
  if (!BASE_URL && import.meta.env.PROD) {
    throw new Error("Не настроен VITE_API_BASE_URL (Netlify env).");
  }

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

  const controller = new AbortController();
  const timeoutMs =
    typeof (options as { timeoutMs?: unknown }).timeoutMs === "number"
      ? ((options as { timeoutMs: number }).timeoutMs ?? DEFAULT_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS;

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Сервер не отвечает. Проверьте интернет и попробуйте ещё раз.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body, response.status));
  }

  return response.json();
}
