import { z } from "zod";

export const createQuoteSchema = z.object({
  supplierName: z.string().trim().min(1, "Tedarikçi adı zorunludur"),
  supplierContact: z.string().trim().optional(),
  price: z.coerce.number().positive("Fiyat 0'dan büyük olmalıdır"),
  currency: z.enum(["TRY", "USD", "AZN"]).default("TRY"),
  paymentTerms: z.string().trim().optional(),
  deliveryTime: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
