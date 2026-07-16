import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES } from "@/lib/constants";
import { updateAssetSchema } from "@/lib/validations/asset";
import { getAssetDetail, updateAsset } from "@/lib/services/assets";
import { listActiveAssetGroups } from "@/lib/services/assetGroups";
import { SubmitButton } from "@/components/SubmitButton";

export default async function DemirbasDuzenlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePageRole(INVENTORY_MANAGE_ROLES);
  const { id } = await params;
  const { error } = await searchParams;
  const [asset, groups] = await Promise.all([
    getAssetDetail(id),
    listActiveAssetGroups(),
  ]);
  if (!asset) notFound();

  async function kaydet(formData: FormData) {
    "use server";
    await requirePageRole(INVENTORY_MANAGE_ROLES);

    const parsed = updateAssetSchema.safeParse({
      assetTag: formData.get("assetTag"),
      name: formData.get("name"),
      brand: formData.get("brand") || undefined,
      model: formData.get("model") || undefined,
      serialNumber: formData.get("serialNumber") || undefined,
      groupId: formData.get("groupId"),
      purchaseDate: formData.get("purchaseDate") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      redirect(`/demirbas/${id}/duzenle?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    try {
      await updateAsset(id, parsed.data);
    } catch (e) {
      redirect(`/demirbas/${id}/duzenle?error=${encodeURIComponent(e instanceof Error ? e.message : "Güncellenemedi")}`);
    }
    redirect(`/demirbas/${id}`);
  }

  const purchaseDateValue = asset.purchaseDate
    ? new Date(asset.purchaseDate).toISOString().slice(0, 10)
    : "";

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Demirbaş Düzenle</h2>
        <Link href={`/demirbas/${id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Detaya dön
        </Link>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Konum, zimmet ve durum değişiklikleri detay sayfasındaki ilgili işlemlerle
        yapılır (hareket geçmişine kaydedilir).
      </p>

      <form action={kaydet} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Etiket No</label>
            <input name="assetTag" required defaultValue={asset.assetTag} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Grup</label>
            <select name="groupId" required defaultValue={asset.groupId} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tanım</label>
          <input name="name" required defaultValue={asset.name} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Marka</label>
            <input name="brand" defaultValue={asset.brand ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Model</label>
            <input name="model" defaultValue={asset.model ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Seri No</label>
            <input name="serialNumber" defaultValue={asset.serialNumber ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Alış Tarihi</label>
          <input name="purchaseDate" type="date" defaultValue={purchaseDateValue} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Not</label>
          <textarea name="notes" rows={2} defaultValue={asset.notes ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>

        {error && <p className="text-sm text-brand-red">{error}</p>}

        <SubmitButton pendingText="Kaydediliyor..." className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark">
          Kaydet
        </SubmitButton>
      </form>
    </div>
  );
}
