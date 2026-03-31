import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getUserId } from "@/api/client";
import { claimReferral, extractReferrerCode } from "@/api/referral";
import { useTelegram } from "@/app/TelegramProvider";

function storageKey(userId: string, code: string) {
  return `flowers_referral_claimed_${userId}_${code}`;
}

function safeGet(key: string): string | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * When the app opens with startapp=ref_… or ?ref=…, registers the referral once per browser session.
 */
export function useReferralAttribution() {
  const { isReady, startParam } = useTelegram();
  const location = useLocation();

  useEffect(() => {
    if (!isReady) return;

    const code = extractReferrerCode(startParam, location.search);
    if (!code) return;

    const userId = getUserId();
    const key = storageKey(userId, code);
    const state = safeGet(key);
    if (state === "1" || state === "pending") return;

    safeSet(key, "pending");

    void claimReferral(code)
      .then(() => {
        safeSet(key, "1");
      })
      .catch(() => {
        safeRemove(key);
      });
  }, [isReady, startParam, location.search]);
}
