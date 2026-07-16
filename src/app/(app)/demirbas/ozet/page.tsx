import Link from "next/link";
import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_VIEW_ROLES, ASSET_STATUS_LABELS, ASSET_STATUS_OPTIONS } from "@/lib/constants";
import { getInventoryDashboardStats } from "@/lib/services/assets";

export default async function DemirbasOzetPage() {
  await requirePageRole(INVENTORY_VIEW_ROLES);
  const stats = await getInventoryDashboardStats();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-2xl font-semibold text-zinc-900">{stats.total}</p>
          <p className="mt-1 text-sm text-zinc-500">Toplam Demirbaş</p>
        </div>
        <Link href="/demirbas?assigned=yes" className="rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 active:scale-[0.98]">
          <p className="text-2xl font-semibold text-zinc-900">{stats.assigned}</p>
          <p className="mt-1 text-sm text-zinc-500">Zimmetli</p>
        </Link>
        <Link href="/demirbas?assigned=no" className="rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 active:scale-[0.98]">
          <p className="text-2xl font-semibold text-zinc-900">{stats.unassigned}</p>
          <p className="mt-1 text-sm text-zinc-500">Zimmetsiz</p>
        </Link>
        <Link href="/demirbas?status=tamirde" className="rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 active:scale-[0.98]">
          <p className="text-2xl font-semibold text-zinc-900">{stats.byStatus.tamirde ?? 0}</p>
          <p className="mt-1 text-sm text-zinc-500">Tamirde</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Duruma Göre</h3>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {ASSET_STATUS_OPTIONS.map((status) => (
                  <tr key={status} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 text-zinc-700">{ASSET_STATUS_LABELS[status]}</td>
                    <td className="px-4 py-2 text-right font-medium text-zinc-900">
                      <Link href={`/demirbas?status=${status}`} className="hover:underline">
                        {stats.byStatus[status] ?? 0}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Depoya Göre Dağılım</h3>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {stats.byWarehouse.map((row) => (
                  <tr key={row.warehouseId} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 text-zinc-700">{row.name}</td>
                    <td className="px-4 py-2 text-right font-medium text-zinc-900">
                      <Link href={`/demirbas?warehouseId=${row.warehouseId}`} className="hover:underline">
                        {row.count}
                      </Link>
                    </td>
                  </tr>
                ))}
                {stats.byWarehouse.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-zinc-400">Kayıt yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
