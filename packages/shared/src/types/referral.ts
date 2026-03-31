export type ReferralStatus = "pending" | "activated" | "rewarded";

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  status: ReferralStatus;
  rewardAmount: number;
  createdAt: string;
}
