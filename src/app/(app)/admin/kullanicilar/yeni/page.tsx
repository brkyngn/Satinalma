import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { createUserSchema } from "@/lib/validations/admin";
import { createUser } from "@/lib/services/users";
import { ROLE_LABELS } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[];

export default async function YeniKullaniciPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePageRole(["admin"]);
  const { error } = await searchParams;

  async function olustur(formData: FormData) {
    "use server";
    const session = await requirePageRole(["admin"]);

    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      phone: formData.get("phone") || undefined,
      roles: formData.getAll("roles"),
    });

    if (!parsed.success) {
      redirect(
        `/admin/kullanicilar/yeni?error=${encodeURIComponent(parsed.error.issues[0].message)}`
      );
    }

    try {
      await createUser(session, parsed.data);
    } catch {
      redirect("/admin/kullanicilar/yeni?error=Bu e-posta zaten kayıtlı");
    }

    redirect("/admin/kullanicilar");
  }

  void session;

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Yeni Kullanıcı</h1>

      <form action={olustur} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Ad Soyad</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">E-posta</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Şifre</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Telefon</label>
          <input
            name="phone"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Roller</span>
          <div className="space-y-1">
            {ROLE_OPTIONS.map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="roles" value={role} />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton
          pendingText="Kaydediliyor..."
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Kullanıcı Oluştur
        </SubmitButton>
      </form>
    </div>
  );
}
