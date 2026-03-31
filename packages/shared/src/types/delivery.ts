export interface DeliverySlot {
  date: string;
  window: DeliveryWindow;
}

export type DeliveryWindow = "09:00-12:00" | "12:00-15:00" | "15:00-18:00" | "18:00-21:00" | "asap";
