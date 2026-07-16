import { z } from "zod";

export const warehouseSchema = z.object({
  name: z.string().trim().min(1, "Depo adı zorunludur"),
  type: z.enum(["merkez", "santiye", "diger"]).default("merkez"),
  address: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
