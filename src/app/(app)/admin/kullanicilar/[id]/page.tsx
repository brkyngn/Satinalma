import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { updateUserSchema } from "@/lib/validations/admin";
import { getUser, updateUser } from "@/lib/services/users";
import { ROLE_LABELS } from "@/lib/constants";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[];

export default async function KullaniciDuzenlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePageRole(["admin"]);
  const { id } = await params;
  const { error } = await searchParams;

  const user = await getUser(id);
  if (!user) notFound();

  const currentRoles = user.roles.map((userRole) => userRole.role.name);

  async function guncelle(formData: FormData) {
    "use server";
    const session = await requirePageRole(["admin"]);

    const parsed = updateUserSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      active: formData.get("active") === "on",
      roles: formData.getAll("roles"),
      password: formData.get("password") || undefined,
    });

    if (!parsed.success) {
      redirect(`/admin/kullanicilar/${id}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    await updateUser(session, id, parsed.data);
    redirect("/admin/kullanicilar");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">
        Kullanıcı Düzenle — {user.email}
      </h1>

      <form action={guncelle} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Ad Soyad</label>
          <input
            name="name"
            defaultValue={user.name}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Telefon</label>
          <input
            name="phone"
            defaultValue={user.phone ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Yeni Şifre <span className="text-zinc-400">(değiştirmek istemiyorsanız boş bırakın)</span>
          </label>
          <input
            name="password"
            type="password"
            minLength={6}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Roller</span>
          <div className="space-y-1">
            {ROLE_OPTIONS.map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="roles"
                  value={role}
                  defaultChecked={currentRoles.includes(role)}
                />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="active" defaultChecked={user.active} />
          Aktif kullanıcı
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Kaydet
        </button>
      </form>
    </div>
  );
}
