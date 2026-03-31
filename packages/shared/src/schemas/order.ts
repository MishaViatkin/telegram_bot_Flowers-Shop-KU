import { z } from "zod";

export const orderIdSchema = z.object({
  id: z.string().min(1),
});
