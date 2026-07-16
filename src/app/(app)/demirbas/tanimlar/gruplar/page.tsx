import Link from "next/link";
import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES } from "@/lib/constants";
import { listAssetGroups } from "@/lib/services/assetGroups";

export default async function GruplarPage() {
  await requirePageRole(INVENTORY_MANAGE_ROLES);
  const groups = await listAssetGroups();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Grup Tanımları</h2>
        <Link
          href="/demirbas/tanimlar/gruplar/yeni"
          className="rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white transition-all hover:bg-brand-navy-dark active:scale-[0.97]"
        >
          Yeni Grup
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Grup Adı</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2 font-medium text-zinc-900">{group.name}</td>
                <td className="px-4 py-2">
                  <span className={group.active ? "text-emerald-700" : "text-red-600"}>
                    {group.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/demirbas/tanimlar/gruplar/${group.id}`}
                    className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-400">
                  Henüz grup tanımlanmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
