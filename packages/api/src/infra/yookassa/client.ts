/**
 * YooKassa REST API (v3). Docs: https://yookassa.ru/developers/api
 */

function getCredentials(): { shopId: string; secretKey: string } {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shopId || !secretKey) {
    throw Object.assign(new Error("YooKassa is not configured"), {
      code: "YOOKASSA_NOT_CONFIGURED",
    });
  }
  return { shopId, secretKey };
}

function basicAuthHeader(shopId: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

const DEFAULT_API = "https://api.yookassa.ru/v3";

function paymentsBaseUrl(): string {
  const raw = process.env.YOOKASSA_API_BASE_URL?.trim();
  if (!raw) return DEFAULT_API;
  return raw.replace(/\/$/, "");
}

export function formatAmountRub(total: number): string {
  return (Math.round(total * 100) / 100).toFixed(2);
}

export function amountsMatchOrderTotal(orderTotal: number, yooValue: string): boolean {
  const v = Number.parseFloat(yooValue.replace(",", "."));
  if (!Number.isFinite(v)) return false;
  return Math.abs(orderTotal - v) < 0.01;
}

export interface CreateYooPaymentInput {
  amountRub: number;
  orderId: string;
  description: string;
  idempotenceKey: string;
  returnUrl: string;
}

export interface YooPaymentSnapshot {
  id: string;
  status: import("@flowers-tg/shared").YooKassaPaymentStatus;
  amount: { value: string; currency: string };
  metadata?: Record<string, unknown>;
  confirmationUrl: string | null;
}

export async function createPayment(input: CreateYooPaymentInput): Promise<YooPaymentSnapshot> {
  const { shopId, secretKey } = getCredentials();
  const url = `${paymentsBaseUrl()}/payments`;

  const body = {
    amount: { value: formatAmountRub(input.amountRub), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: input.returnUrl },
    description: input.description.slice(0, 128),
    metadata: { orderId: input.orderId },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(shopId, secretKey),
      "Content-Type": "application/json",
      "Idempotence-Key": input.idempotenceKey,
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(`YooKassa HTTP ${res.status}`), {
      code: "YOOKASSA_HTTP_ERROR",
      status: res.status,
      bodySnippet: rawText.slice(0, 200),
    });
  }

  let data: {
    id: string;
    status: import("@flowers-tg/shared").YooKassaPaymentStatus;
    amount: { value: string; currency: string };
    metadata?: Record<string, unknown>;
    confirmation?: { confirmation_url?: string; type?: string };
  };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw Object.assign(new Error("Invalid JSON from YooKassa"), { code: "YOOKASSA_BAD_RESPONSE" });
  }

  return {
    id: data.id,
    status: data.status,
    amount: data.amount,
    metadata: data.metadata,
    confirmationUrl: data.confirmation?.confirmation_url ?? null,
  };
}

export async function getPayment(paymentId: string): Promise<YooPaymentSnapshot> {
  const { shopId, secretKey } = getCredentials();
  const url = `${paymentsBaseUrl()}/payments/${encodeURIComponent(paymentId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: basicAuthHeader(shopId, secretKey),
    },
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(`YooKassa get payment HTTP ${res.status}`), {
      code: "YOOKASSA_HTTP_ERROR",
      status: res.status,
    });
  }

  const data = JSON.parse(rawText) as {
    id: string;
    status: import("@flowers-tg/shared").YooKassaPaymentStatus;
    amount: { value: string; currency: string };
    metadata?: Record<string, unknown>;
    confirmation?: { confirmation_url?: string };
  };

  return {
    id: data.id,
    status: data.status,
    amount: data.amount,
    metadata: data.metadata,
    confirmationUrl: data.confirmation?.confirmation_url ?? null,
  };
}
