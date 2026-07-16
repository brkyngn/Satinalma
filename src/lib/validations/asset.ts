import { z } from "zod";

// Yeni demirbaş oluşturma: başlangıç konumu, opsiyonel zimmet ve durum girilir.
export const createAssetSchema = z.object({
  assetTag: z.string().trim().optional(), // boşsa otomatik üretilir (DMB-0001)
  name: z.string().trim().min(1, "Tanım zorunludur"),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  groupId: z.string().trim().min(1, "Grup seçiniz"),
  currentWarehouseId: z.string().trim().min(1, "Konum seçiniz"),
  currentAssigneeId: z.string().trim().optional(), // boşsa zimmetsiz
  status: z.enum(["aktif", "tamirde", "hurda", "kayip"]).default("aktif"),
  purchaseDate: z.string().trim().optional(), // ISO tarih (yyyy-mm-dd) veya boş
  notes: z.string().trim().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

// Düzenleme yalnızca tanımlayıcı alanları değiştirir. Konum, zimmet ve durum
// hareket geçmişi üretmesi gerektiğinden ayrı işlemlerle (transfer/zimmet/iade/
// durum) değiştirilir; burada yer almaz.
export const updateAssetSchema = z.object({
  assetTag: z.string().trim().min(1, "Etiket no zorunludur"),
  name: z.string().trim().min(1, "Tanım zorunludur"),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  groupId: z.string().trim().min(1, "Grup seçiniz"),
  purchaseDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
