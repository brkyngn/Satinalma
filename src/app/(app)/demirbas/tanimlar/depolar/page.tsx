import Link from "next/link";
import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES, WAREHOUSE_TYPE_LABELS } from "@/lib/constants";
import { listWarehouses } from "@/lib/services/warehouses";

export default async function DepolarPage() {
  await requirePageRole(INVENTORY_MANAGE_ROLES);
  const warehouses = await listWarehouses();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Depo / Konum Tanımları</h2>
        <Link
          href="/demirbas/tanimlar/depolar/yeni"
          className="rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white transition-all hover:bg-brand-navy-dark active:scale-[0.97]"
        >
          Yeni Depo
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Ad</th>
              <th className="px-4 py-2 font-medium">Tip</th>
              <th className="px-4 py-2 font-medium">Adres</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2 font-medium text-zinc-900">{warehouse.name}</td>
                <td className="px-4 py-2 text-zinc-600">
                  {WAREHOUSE_TYPE_LABELS[warehouse.type] ?? warehouse.type}
                </td>
                <td className="px-4 py-2 text-zinc-600">{warehouse.address}</td>
                <td className="px-4 py-2">
                  <span className={warehouse.active ? "text-emerald-700" : "text-red-600"}>
                    {warehouse.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/demirbas/tanimlar/depolar/${warehouse.id}`}
                    className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
            {warehouses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Henüz depo tanımlanmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
