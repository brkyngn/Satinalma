import { z } from "zod";

export const assetGroupSchema = z.object({
  name: z.string().trim().min(1, "Grup adı zorunludur"),
  active: z.boolean().default(true),
});

export type AssetGroupInput = z.infer<typeof assetGroupSchema>;
