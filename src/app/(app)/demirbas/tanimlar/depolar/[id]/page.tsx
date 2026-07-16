import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES, WAREHOUSE_TYPE_LABELS, WAREHOUSE_TYPE_OPTIONS } from "@/lib/constants";
import { warehouseSchema } from "@/lib/validations/warehouse";
import { getWarehouse, updateWarehouse } from "@/lib/services/warehouses";
import { SubmitButton } from "@/components/SubmitButton";

export default async function DepoDuzenlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePageRole(INVENTORY_MANAGE_ROLES);
  const { id } = await params;
  const { error } = await searchParams;
  const warehouse = await getWarehouse(id);
  if (!warehouse) notFound();

  async function kaydet(formData: FormData) {
    "use server";
    await requirePageRole(INVENTORY_MANAGE_ROLES);

    const parsed = warehouseSchema.safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      address: formData.get("address") || undefined,
      active: formData.get("active") === "on",
    });
    if (!parsed.success) {
      redirect(`/demirbas/tanimlar/depolar/${id}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    await updateWarehouse(id, parsed.data);
    redirect("/demirbas/tanimlar/depolar");
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-4 text-base font-semibold text-zinc-900">Depo Düzenle</h2>
      <form action={kaydet} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Ad</label>
          <input name="name" required defaultValue={warehouse.name} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tip</label>
          <select name="type" defaultValue={warehouse.type} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
            {WAREHOUSE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{WAREHOUSE_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Adres</label>
          <input name="address" defaultValue={warehouse.address ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="active" defaultChecked={warehouse.active} className="rounded border-zinc-300" />
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
