import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES } from "@/lib/constants";
import { personnelSchema } from "@/lib/validations/personnel";
import { createPersonnel } from "@/lib/services/personnel";
import { SubmitButton } from "@/components/SubmitButton";

export default async function YeniPersonelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePageRole(INVENTORY_MANAGE_ROLES);
  const { error } = await searchParams;

  async function ekle(formData: FormData) {
    "use server";
    await requirePageRole(INVENTORY_MANAGE_ROLES);

    const parsed = personnelSchema.safeParse({
      fullName: formData.get("fullName"),
      title: formData.get("title") || undefined,
      department: formData.get("department") || undefined,
      phone: formData.get("phone") || undefined,
      active: formData.get("active") === "on",
    });
    if (!parsed.success) {
      redirect(`/demirbas/tanimlar/personel/yeni?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    await createPersonnel(parsed.data);
    redirect("/demirbas/tanimlar/personel");
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-4 text-base font-semibold text-zinc-900">Yeni Personel</h2>
      <form action={ekle} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Ad Soyad</label>
          <input name="fullName" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Ünvan</label>
            <input name="title" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Departman</label>
            <input name="department" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Telefon</label>
          <input name="phone" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="active" defaultChecked className="rounded border-zinc-300" />
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
