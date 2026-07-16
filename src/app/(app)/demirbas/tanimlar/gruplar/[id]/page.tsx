import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES } from "@/lib/constants";
import { assetGroupSchema } from "@/lib/validations/assetGroup";
import { getAssetGroup, updateAssetGroup } from "@/lib/services/assetGroups";
import { SubmitButton } from "@/components/SubmitButton";

export default async function GrupDuzenlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePageRole(INVENTORY_MANAGE_ROLES);
  const { id } = await params;
  const { error } = await searchParams;
  const group = await getAssetGroup(id);
  if (!group) notFound();

  async function kaydet(formData: FormData) {
    "use server";
    await requirePageRole(INVENTORY_MANAGE_ROLES);

    const parsed = assetGroupSchema.safeParse({
      name: formData.get("name"),
      active: formData.get("active") === "on",
    });
    if (!parsed.success) {
      redirect(`/demirbas/tanimlar/gruplar/${id}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    try {
      await updateAssetGroup(id, parsed.data);
    } catch (e) {
      redirect(`/demirbas/tanimlar/gruplar/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "Grup güncellenemedi")}`);
    }
    redirect("/demirbas/tanimlar/gruplar");
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-4 text-base font-semibold text-zinc-900">Grup Düzenle</h2>
      <form action={kaydet} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Grup Adı</label>
          <input name="name" required defaultValue={group.name} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="active" defaultChecked={group.active} className="rounded border-zinc-300" />
          Aktif
        </label>

        {error && <p className="text-sm text-brand-red">{error}</p>}

        <SubmitButton pendingText="Kaydediliyor..." className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark">
          Kaydet
        </SubmitButton>
      </form>
    </div>
  );
}
