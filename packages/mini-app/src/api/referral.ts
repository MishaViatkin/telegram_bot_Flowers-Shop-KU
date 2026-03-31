import { getInitData, getUserId } from "./client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const initData = getInitData();
  if (initData) headers["X-Init-Data"] = initData;
  else headers["X-User-Id"] = getUserId();
  return headers;
}

export function extractReferrerCode(startParam: string | null, search: string): string | null {
  if (startParam?.startsWith("ref_")) {
    const c = startParam.slice(4).trim();
    if (c) return c;
  }
  const q = new URLSearchParams(search).get("ref");
  const t = q?.trim();
  return t || null;
}

type ApiErr = { success?: boolean; error?: { code?: string } };

/**
 * Registers referral for the current user. Idempotent for business errors (already referred, etc.).
 */
export async function claimReferral(referrerCode: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/users/referral`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ referrerCode }),
  });

  if (res.ok) return;

  const body = (await res.json().catch(() => null)) as ApiErr | null;
  const code = body?.error?.code;
  if (code === "ALREADY_REFERRED" || code === "SELF_REFERRAL" || code === "REFERRER_NOT_FOUND") {
    return;
  }

  throw new Error(code || `referral_failed_${res.status}`);
}
