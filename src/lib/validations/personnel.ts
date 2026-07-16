import { z } from "zod";

export const personnelSchema = z.object({
  fullName: z.string().trim().min(1, "Ad soyad zorunludur"),
  title: z.string().trim().optional(),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export type PersonnelInput = z.infer<typeof personnelSchema>;
