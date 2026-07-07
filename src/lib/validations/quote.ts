import { z } from "zod";

export const createQuoteSchema = z.object({
  supplierName: z.string().trim().min(1, "Tedarikçi adı zorunludur"),
  supplierContact: z.string().trim().optional(),
  price: z.coerce.number().positive("Fiyat 0'dan büyük olmalıdır"),
  currency: z.enum(["TRY", "USD", "AZN", "EUR"]).default("AZN"),
  paymentTerms: z.string().trim().optional(),
  deliveryTime: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

// Talepteki bir kaleme girilen birim fiyat. itemId formda dinamik olarak
// (itemPrice_<itemId>) taşındığı için ayrı bir tipte tutulur.
export type QuoteItemPriceInput = { itemId: string; unitPrice: number };
