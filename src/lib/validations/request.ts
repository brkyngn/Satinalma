import { z } from "zod";

export const requestItemSchema = z.object({
  productName: z.string().trim().min(1, "Ürün adı zorunludur"),
  quantity: z.coerce.number().positive("Miktar 0'dan büyük olmalıdır"),
  unit: z.string().trim().min(1, "Birim zorunludur"),
  specNote: z.string().trim().optional(),
});

export const createRequestSchema = z.object({
  projectId: z.string().min(1, "Proje seçilmelidir"),
  title: z.string().trim().min(1, "Başlık zorunludur"),
  description: z.string().trim().optional(),
  neededByDate: z.coerce.date().optional(),
  items: z.array(requestItemSchema).min(1, "En az bir kalem eklenmelidir"),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
