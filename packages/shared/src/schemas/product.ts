import { z } from "zod";

export const catalogFiltersSchema = z.object({
  categoryId: z.string().optional(),
  search: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(["price_asc", "price_desc", "popular", "newest"]).optional().default("popular"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

export type CatalogFiltersInput = z.infer<typeof catalogFiltersSchema>;
