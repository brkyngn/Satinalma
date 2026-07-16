import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageRole, hasRole } from "@/lib/rbac";
import {
  INVENTORY_VIEW_ROLES,
  INVENTORY_MANAGE_ROLES,
  WAREHOUSE_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
  ASSET_STATUS_LABELS,
} from "@/lib/constants";
import {
  getAssetDetail,
  transferAssets,
  assignAsset,
  returnAsset,
  changeAssetStatus,
  archiveAsset,
} from "@/lib/services/assets";
import { listActiveWarehouses } from "@/lib/services/warehouses";
import { listActivePersonnel } from "@/lib/services/personnel";
import { AssetStatusBadge } from "@/components/AssetStatusBadge";
import { AssetActions } from "@/components/AssetActions";
import { formatDate } from "@/lib/utils";

type Movement = NonNullable<Awaited<ReturnType<typeof getAssetDetail>>>["movements"][number];

function describeMovement(movement: Movement): string {
  switch (movement.type) {
    case "KAYIT":
      return `Konum: ${movement.toWarehouse?.name ?? "-"}${
        movement.toAssignee ? ` · Zimmet: ${movement.toAssignee.fullName}` : ""
      }`;
    case "TRANSFER":
      return `${movement.fromWarehouse?.name ?? "-"} → ${movement.toWarehouse?.name ?? "-"}`;
    case "ZIMMET":
      return `${movement.fromAssignee?.fullName ?? "Zimmetsiz"} → ${movement.toAssignee?.fullName ?? "-"}`;
    case "IADE":
      return `${movement.fromAssignee?.fullName ?? "-"} → Zimmetsiz (teslim alındı)`;
    case "DURUM":
      return `${ASSET_STATUS_LABELS[movement.oldStatus ?? ""] ?? movement.oldStatus ?? "-"} → ${
        ASSET_STATUS_LABELS[movement.newStatus ?? ""] ?? movement.newStatus ?? "-"
      }`;
    default:
      return "";
  }
}

export default async function DemirbasDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePageRole(INVENTORY_VIEW_ROLES);
  const isManager = hasRole(session.user.roles, INVENTORY_MANAGE_ROLES);
  const isAdmin = session.user.roles.includes("admin");
  const { id } = await params;
  const { error } = await searchParams;
  const asset = await getAssetDetail(id);
  if (!asset) notFound();

  const [warehouses, personnel] = isManager
    ? await Promise.all([listActiveWarehouses(), listActivePersonnel()])
    : [[], []];

  async function transferAction(formData: FormData) {
    "use server";
    const s = await requirePageRole(INVENTORY_MANAGE_ROLES);
    try {
      await transferAssets(s, [id], String(formData.get("toWarehouseId")), String(formData.get("note") || "") || undefined);
    } catch (e) {
      redirect(`/demirbas/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "İşlem başarısız")}`);
    }
    redirect(`/demirbas/${id}`);
  }

  async function assignAction(formData: FormData) {
    "use server";
    const s = await requirePageRole(INVENTORY_MANAGE_ROLES);
    try {
      await assignAsset(s, id, String(formData.get("toAssigneeId")), String(formData.get("note") || "") || undefined);
    } catch (e) {
      redirect(`/demirbas/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "İşlem başarısız")}`);
    }
    redirect(`/demirbas/${id}`);
  }

  async function returnAction(formData: FormData) {
    "use server";
    const s = await requirePageRole(INVENTORY_MANAGE_ROLES);
    const toWarehouseId = String(formData.get("toWarehouseId") || "") || undefined;
    try {
      await returnAsset(s, id, toWarehouseId, String(formData.get("note") || "") || undefined);
    } catch (e) {
      redirect(`/demirbas/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "İşlem başarısız")}`);
    }
    redirect(`/demirbas/${id}`);
  }

  async function statusAction(formData: FormData) {
    "use server";
    const s = await requirePageRole(INVENTORY_MANAGE_ROLES);
    try {
      await changeAssetStatus(s, id, formData.get("newStatus") as never, String(formData.get("note") || ""));
    } catch (e) {
      redirect(`/demirbas/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "İşlem başarısız")}`);
    }
    redirect(`/demirbas/${id}`);
  }

  async function archiveAction(formData: FormData) {
    "use server";
    const s = await requirePageRole(["admin"]);
    const archived = formData.get("archived") === "true";
    try {
      await archiveAsset(s, id, archived);
    } catch (e) {
      redirect(`/demirbas/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "İşlem başarısız")}`);
    }
    redirect(`/demirbas/${id}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">
              {asset.assetTag} — {asset.name}
            </h2>
            <AssetStatusBadge status={asset.status} />
            {asset.archived && (
              <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                Arşivlenmiş
              </span>
            )}
          </div>
          {isManager && (
            <Link
              href={`/demirbas/${asset.id}/duzenle`}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Düzenle
            </Link>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-zinc-600 sm:grid-cols-3">
          <div>
            <dt className="text-zinc-400">Marka / Model</dt>
            <dd>{[asset.brand, asset.model].filter(Boolean).join(" ") || "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Seri No</dt>
            <dd>{asset.serialNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Grup</dt>
            <dd>{asset.group.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Konum</dt>
            <dd>
              {asset.currentWarehouse.name}{" "}
              <span className="text-zinc-400">
                ({WAREHOUSE_TYPE_LABELS[asset.currentWarehouse.type] ?? asset.currentWarehouse.type})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-400">Zimmetli Kişi</dt>
            <dd>{asset.currentAssignee?.fullName ?? <span className="text-zinc-400">Zimmetsiz</span>}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Alış Tarihi</dt>
            <dd>{asset.purchaseDate ? formatDate(asset.purchaseDate) : "-"}</dd>
          </div>
        </dl>
        {asset.notes && <p className="mt-3 text-sm text-zinc-600">{asset.notes}</p>}
      </div>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      {isManager && (
        <AssetActions
          isAssigned={!!asset.currentAssigneeId}
          isAdmin={isAdmin}
          archived={asset.archived}
          warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
          personnel={personnel.map((p) => ({ id: p.id, name: p.fullName }))}
          transferAction={transferAction}
          assignAction={assignAction}
          returnAction={returnAction}
          statusAction={statusAction}
          archiveAction={archiveAction}
        />
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-900">Hareket Geçmişi</h3>
        <div className="space-y-2">
          {asset.movements.map((movement) => (
            <div key={movement.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-medium text-brand-navy">
                  {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                </span>
                <span className="text-xs text-zinc-400">{formatDate(movement.createdAt)}</span>
              </div>
              <p className="mt-1 text-zinc-800">{describeMovement(movement)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                İşlemi yapan: {movement.performedBy.name}
                {movement.note ? ` · ${movement.note}` : ""}
              </p>
            </div>
          ))}
          {asset.movements.length === 0 && (
            <p className="text-sm text-zinc-400">Hareket kaydı yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}
