import type { DeliveryWindow } from "../types/delivery.js";

export const DELIVERY_WINDOWS: DeliveryWindow[] = [
  "09:00-12:00",
  "12:00-15:00",
  "15:00-18:00",
  "18:00-21:00",
  "asap",
];

export const DELIVERY_WINDOW_LABELS: Record<DeliveryWindow, string> = {
  "09:00-12:00": "Утро (9:00 - 12:00)",
  "12:00-15:00": "День (12:00 - 15:00)",
  "15:00-18:00": "После обеда (15:00 - 18:00)",
  "18:00-21:00": "Вечер (18:00 - 21:00)",
  asap: "Как можно скорее",
};

export const DELIVERY_FEE = 0;
export const FREE_DELIVERY_THRESHOLD = 0;
export const SAME_DAY_CUTOFF_HOUR = 16;
