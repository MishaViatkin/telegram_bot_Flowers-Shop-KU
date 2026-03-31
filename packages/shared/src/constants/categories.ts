import type { Category } from "../types/product.js";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "bouquets", name: "Букеты", slug: "bouquets", sortOrder: 1 },
  { id: "roses", name: "Розы", slug: "roses", sortOrder: 2 },
  { id: "compositions", name: "Композиции", slug: "compositions", sortOrder: 3 },
  { id: "wedding", name: "Свадебные", slug: "wedding", sortOrder: 4 },
  { id: "baskets", name: "Корзины", slug: "baskets", sortOrder: 5 },
  { id: "indoor", name: "Комнатные", slug: "indoor", sortOrder: 6 },
  { id: "gifts", name: "Подарки", slug: "gifts", sortOrder: 7 },
];
