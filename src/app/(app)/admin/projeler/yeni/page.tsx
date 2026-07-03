import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { createProjectSchema } from "@/lib/validations/admin";
import { createProject } from "@/lib/services/projects";
import { SubmitButton } from "@/components/SubmitButton";

export default async function YeniProjePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePageRole(["admin"]);
  const { error } = await searchParams;

  async function olustur(formData: FormData) {
    "use server";
    const session = await requirePageRole(["admin"]);

    const parsed = createProjectSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      address: formData.get("address") || undefined,
    });

    if (!parsed.success) {
      redirect(`/admin/projeler/yeni?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    try {
      await createProject(session, parsed.data);
    } catch {
      redirect("/admin/projeler/yeni?error=Bu proje kodu zaten kullanılıyor");
    }

    redirect("/admin/projeler");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Yeni Proje / Şantiye</h1>

      <form action={olustur} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Proje Adı</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Proje Kodu</label>
          <input
            name="code"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Adres</label>
          <textarea
            name="address"
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton
          pendingText="Kaydediliyor..."
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Proje Oluştur
        </SubmitButton>
      </form>
    </div>
  );
}
