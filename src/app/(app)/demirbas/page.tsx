import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageRole, hasRole } from "@/lib/rbac";
import {
  INVENTORY_VIEW_ROLES,
  INVENTORY_MANAGE_ROLES,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
} from "@/lib/constants";
import { listAssets, transferAssets } from "@/lib/services/assets";
import { listActiveWarehouses } from "@/lib/services/warehouses";
import { listActiveAssetGroups } from "@/lib/services/assetGroups";
import { listActivePersonnel } from "@/lib/services/personnel";
import { AssetStatusBadge } from "@/components/AssetStatusBadge";
import { SubmitButton } from "@/components/SubmitButton";

export default async function DemirbasListePage({
  searchParams,
}: {
  searchParams: Promise<{
    warehouseId?: string;
    groupId?: string;
    status?: string;
    assigned?: string;
    assigneeId?: string;
    search?: string;
    error?: string;
  }>;
}) {
  const session = await requirePageRole(INVENTORY_VIEW_ROLES);
  const isManager = hasRole(session.user.roles, INVENTORY_MANAGE_ROLES);
  const filters = await searchParams;

  const [assets, warehouses, groups, personnel] = await Promise.all([
    listAssets(filters),
    listActiveWarehouses(),
    listActiveAssetGroups(),
    listActivePersonnel(),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter(([k, v]) => v && k !== "error") as [string, string][]
  ).toString();

  async function bulkTransfer(formData: FormData) {
    "use server";
    const s = await requirePageRole(INVENTORY_MANAGE_ROLES);
    const assetIds = formData.getAll("assetIds").map(String).filter(Boolean);
    const toWarehouseId = String(formData.get("toWarehouseId") || "");
    const note = String(formData.get("note") || "") || undefined;

    if (assetIds.length === 0) {
      redirect(`/demirbas?error=${encodeURIComponent("En az bir demirbaş seçin")}`);
    }
    if (!toWarehouseId) {
      redirect(`/demirbas?error=${encodeURIComponent("Hedef depo seçin")}`);
    }
    try {
      await transferAssets(s, assetIds, toWarehouseId, note);
    } catch (e) {
      redirect(`/demirbas?error=${encodeURIComponent(e instanceof Error ? e.message : "Transfer başarısız")}`);
    }
    redirect("/demirbas");
  }

  const colCount = isManager ? 8 : 7;

  const table = (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
          <tr>
            {isManager && <th className="w-8 px-4 py-2" />}
            <th className="px-4 py-2 font-medium">Etiket No</th>
            <th className="px-4 py-2 font-medium">Tanım</th>
            <th className="px-4 py-2 font-medium">Marka / Model</th>
            <th className="px-4 py-2 font-medium">Grup</th>
            <th className="px-4 py-2 font-medium">Konum</th>
            <th className="px-4 py-2 font-medium">Zimmetli Kişi</th>
            <th className="px-4 py-2 font-medium">Durum</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
              {isManager && (
                <td className="px-4 py-2">
                  <input type="checkbox" name="assetIds" value={asset.id} className="rounded border-zinc-300" />
                </td>
              )}
              <td className="px-4 py-2">
                <Link href={`/demirbas/${asset.id}`} className="font-medium text-zinc-900 hover:underline">
                  {asset.assetTag}
                </Link>
              </td>
              <td className="px-4 py-2 text-zinc-700">{asset.name}</td>
              <td className="px-4 py-2 text-zinc-600">
                {[asset.brand, asset.model].filter(Boolean).join(" ")}
              </td>
              <td className="px-4 py-2 text-zinc-600">{asset.group.name}</td>
              <td className="px-4 py-2 text-zinc-600">{asset.currentWarehouse.name}</td>
              <td className="px-4 py-2 text-zinc-600">
                {asset.currentAssignee?.fullName ?? <span className="text-zinc-400">Zimmetsiz</span>}
              </td>
              <td className="px-4 py-2">
                <AssetStatusBadge status={asset.status} />
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-4 py-6 text-center text-zinc-400">
                Kayıt bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Demirbaş Listesi</h2>
        <div className="flex items-center gap-2">
          <a
            href={`/api/assets/export${exportQuery ? `?${exportQuery}` : ""}`}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Excel Dışa Aktar
          </a>
          {isManager && (
            <Link
              href="/demirbas/yeni"
              className="rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white transition-all hover:bg-brand-navy-dark active:scale-[0.97]"
            >
              Yeni Demirbaş
            </Link>
          )}
        </div>
      </div>

      <form className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-6">
        <input
          name="search"
          defaultValue={filters.search}
          placeholder="Etiket / tanım / marka / seri no"
          className="col-span-2 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <select name="warehouseId" defaultValue={filters.warehouseId ?? ""} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm">
          <option value="">Tüm konumlar</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select name="groupId" defaultValue={filters.groupId ?? ""} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm">
          <option value="">Tüm gruplar</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm">
          <option value="">Tüm durumlar</option>
          {ASSET_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{ASSET_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select name="assigned" defaultValue={filters.assigned ?? ""} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm">
          <option value="">Zimmet (hepsi)</option>
          <option value="yes">Zimmetli</option>
          <option value="no">Zimmetsiz</option>
        </select>
        <select name="assigneeId" defaultValue={filters.assigneeId ?? ""} className="col-span-2 rounded-md border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-1">
          <option value="">Tüm personel</option>
          {personnel.map((p) => (
            <option key={p.id} value={p.id}>{p.fullName}</option>
          ))}
        </select>
        <button
          type="submit"
          className="col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 active:bg-zinc-100 sm:col-span-6"
        >
          Filtrele
        </button>
      </form>

      {filters.error && <p className="mb-4 text-sm text-brand-red">{filters.error}</p>}

      {isManager ? (
        <form action={bulkTransfer} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
            <span className="text-zinc-500">Seçilenleri toplu transfer:</span>
            <select name="toWarehouseId" defaultValue="" className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="">Hedef depo</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <input name="note" placeholder="Not (opsiyonel)" className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
            <SubmitButton pendingText="Aktarılıyor..." className="rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-navy-dark">
              Seçilenleri Transfer Et
            </SubmitButton>
          </div>
          {table}
        </form>
      ) : (
        table
      )}
    </div>
  );
}
