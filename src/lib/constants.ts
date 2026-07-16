import type { RoleName } from "../../generated/prisma/enums";

export const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  submitted: "Gönderildi",
  quotes_collecting: "Teklif Toplanıyor",
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  shipped: "Sevk Edildi",
  delivered_pending_acceptance: "Teslim Edildi (Kabul Bekliyor)",
  accepted: "Kabul Edildi",
  partially_accepted: "Kısmi Kabul Edildi",
  closed: "Kapandı",
};

export const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  submitted: "bg-blue-100 text-blue-700",
  quotes_collecting: "bg-blue-100 text-blue-700",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  shipped: "bg-violet-100 text-violet-700",
  delivered_pending_acceptance: "bg-violet-100 text-violet-700",
  accepted: "bg-emerald-100 text-emerald-700",
  partially_accepted: "bg-amber-100 text-amber-700",
  closed: "bg-zinc-200 text-zinc-700",
};

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: "Admin",
  requester: "Talep Eden",
  purchasing: "Satın Alma Sorumlusu",
  approver: "Onaylayıcı",
  site_manager: "Şantiye Sorumlusu",
  inventory_manager: "Demirbaş Sorumlusu",
  inventory_viewer: "Demirbaş İzleyici",
};

export const CURRENCY_OPTIONS = ["AZN", "TRY", "USD", "EUR"] as const;

export const DEFAULT_CURRENCY = "AZN";

// --- Demirbaş ve Zimmet modülü ---

// Görüntüleme (liste/detay/özet/dışa aktarma) — admin hasRole ile zaten dahil.
export const INVENTORY_VIEW_ROLES: RoleName[] = [
  "inventory_manager",
  "inventory_viewer",
];

// İşlem yapma (ekle/düzenle/transfer/zimmet/iade/durum/içe aktar/tanımlar).
export const INVENTORY_MANAGE_ROLES: RoleName[] = ["inventory_manager"];

export const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  merkez: "Merkez Depo",
  santiye: "Şantiye",
  diger: "Diğer",
};

export const WAREHOUSE_TYPE_OPTIONS = ["merkez", "santiye", "diger"] as const;

export const ASSET_STATUS_LABELS: Record<string, string> = {
  aktif: "Aktif",
  tamirde: "Tamirde",
  hurda: "Hurda",
  kayip: "Kayıp",
};

export const ASSET_STATUS_OPTIONS = ["aktif", "tamirde", "hurda", "kayip"] as const;

export const ASSET_STATUS_BADGE_STYLES: Record<string, string> = {
  aktif: "bg-emerald-100 text-emerald-700",
  tamirde: "bg-amber-100 text-amber-700",
  hurda: "bg-zinc-200 text-zinc-700",
  kayip: "bg-red-100 text-red-700",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  KAYIT: "Kayıt",
  TRANSFER: "Transfer",
  ZIMMET: "Zimmet",
  IADE: "İade",
  DURUM: "Durum Değişikliği",
};
