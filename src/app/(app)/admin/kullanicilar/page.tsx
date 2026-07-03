import Link from "next/link";
import { requirePageRole } from "@/lib/rbac";
import { listUsers } from "@/lib/services/users";
import { ROLE_LABELS } from "@/lib/constants";

export default async function KullanicilarPage() {
  await requirePageRole(["admin"]);
  const users = await listUsers();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Kullanıcılar</h1>
        <Link
          href="/admin/kullanicilar/yeni"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Yeni Kullanıcı
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Ad Soyad</th>
              <th className="px-4 py-2 font-medium">E-posta</th>
              <th className="px-4 py-2 font-medium">Roller</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2 text-zinc-900">{user.name}</td>
                <td className="px-4 py-2 text-zinc-600">{user.email}</td>
                <td className="px-4 py-2 text-zinc-600">
                  {user.roles
                    .map((userRole) => ROLE_LABELS[userRole.role.name] ?? userRole.role.name)
                    .join(", ")}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      user.active
                        ? "text-emerald-700"
                        : "text-red-600"
                    }
                  >
                    {user.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/kullanicilar/${user.id}`}
                    className="text-sm text-zinc-600 hover:text-zinc-900"
                  >
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Henüz kullanıcı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
