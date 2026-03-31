export type PromoType = "percentage" | "fixed";

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  validUntil: string;
  minOrderAmount?: number;
  maxUses: number;
  usedCount: number;
  userId?: string;
  active: boolean;
}
