import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import {
  INVENTORY_MANAGE_ROLES,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
} from "@/lib/constants";
import { createAssetSchema } from "@/lib/validations/asset";
import { createAsset } from "@/lib/services/assets";
import { listActiveWarehouses } from "@/lib/services/warehouses";
import { listActiveAssetGroups } from "@/lib/services/assetGroups";
import { listActivePersonnel } from "@/lib/services/personnel";
import { SubmitButton } from "@/components/SubmitButton";

export default async function YeniDemirbasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePageRole(INVENTORY_MANAGE_ROLES);
  const { error } = await searchParams;

  const [warehouses, groups, personnel] = await Promise.all([
    listActiveWarehouses(),
    listActiveAssetGroups(),
    listActivePersonnel(),
  ]);

  const needsSetup = warehouses.length === 0 || groups.length === 0;

  async function ekle(formData: FormData) {
    "use server";
    const session = await requirePageRole(INVENTORY_MANAGE_ROLES);

    const parsed = createAssetSchema.safeParse({
      assetTag: formData.get("assetTag") || undefined,
      name: formData.get("name"),
      brand: formData.get("brand") || undefined,
      model: formData.get("model") || undefined,
      serialNumber: formData.get("serialNumber") || undefined,
      groupId: formData.get("groupId"),
      currentWarehouseId: formData.get("currentWarehouseId"),
      currentAssigneeId: formData.get("currentAssigneeId") || undefined,
      status: formData.get("status"),
      purchaseDate: formData.get("purchaseDate") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      redirect(`/demirbas/yeni?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    let assetId: string;
    try {
      const asset = await createAsset(session, parsed.data);
      assetId = asset.id;
    } catch (e) {
      redirect(`/demirbas/yeni?error=${encodeURIComponent(e instanceof Error ? e.message : "Demirbaş eklenemedi")}`);
    }
    redirect(`/demirbas/${assetId}`);
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 text-base font-semibold text-zinc-900">Yeni Demirbaş</h2>

      {needsSetup && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Demirbaş eklemeden önce en az bir <strong>depo</strong> ve bir <strong>grup</strong> tanımlamalısınız.
          (Tanımlar sekmesi)
        </p>
      )}

      <form action={ekle} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Etiket No <span className="text-zinc-400">(boşsa otomatik)</span>
            </label>
            <input name="assetTag" placeholder="DMB-0001" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Durum</label>
            <select name="status" defaultValue="aktif" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
              {ASSET_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{ASSET_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tanım</label>
          <input name="name" required placeholder="Örn. Bosch GBH 2-26 Kırıcı Delici" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Marka</label>
            <input name="brand" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Model</label>
            <input name="model" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Seri No</label>
            <input name="serialNumber" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Grup</label>
            <select name="groupId" required defaultValue="" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
              <option value="" disabled>Seçiniz</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Konum / Depo</label>
            <select name="currentWarehouseId" required defaultValue="" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
              <option value="" disabled>Seçiniz</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Zimmetli Kişi <span className="text-zinc-400">(opsiyonel)</span>
            </label>
            <select name="currentAssigneeId" defaultValue="" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
              <option value="">Zimmetsiz</option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Alış Tarihi <span className="text-zinc-400">(opsiyonel)</span>
            </label>
            <input name="purchaseDate" type="date" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Not</label>
          <textarea name="notes" rows={2} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>

        {error && <p className="text-sm text-brand-red">{error}</p>}

        <SubmitButton pendingText="Kaydediliyor..." className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark">
          Demirbaşı Kaydet
        </SubmitButton>
      </form>
    </div>
  );
}
