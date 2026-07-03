import { z } from "zod";

export const createDeliverySchema = z.object({
  quoteId: z.string().min(1, "Onaylanan teklif bulunamadı"),
  shippedDate: z.coerce.date(),
  waybillNumber: z.string().trim().min(1, "İrsaliye no zorunludur"),
  notes: z.string().trim().optional(),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const createDeliveryAcceptanceSchema = z.object({
  acceptedQuantity: z.coerce.number().nonnegative("Miktar negatif olamaz"),
  status: z.enum(["full", "partial", "rejected"]),
  notes: z.string().trim().optional(),
});

export type CreateDeliveryAcceptanceInput = z.infer<
  typeof createDeliveryAcceptanceSchema
>;
