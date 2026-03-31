export interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  referralCode: string;
  referredBy?: string;
  firstOrderPromoIssued: boolean;
  createdAt: string;
}
