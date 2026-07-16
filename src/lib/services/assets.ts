import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateAssetInput, UpdateAssetInput } from "@/lib/validations/asset";
import type { Session } from "next-auth";
import type { Prisma } from "../../../generated/prisma/client";

// Etiket no, silinen/arşivlenen kayıtlardan etkilenmemesi için mevcut en büyük
// numaradan türetilir (sıfır dolgulu olduğundan sözlüksel azalan = sayısal en büyük).
async function generateAssetTag(tx: Prisma.TransactionClient) {
  const prefix = "DMB-";
  const latest = await tx.asset.findFirst({
    where: { assetTag: { startsWith: prefix } },
    orderBy: { assetTag: "desc" },
    select: { assetTag: true },
  });
  const lastSeq = latest ? Number(latest.assetTag.slice(prefix.length)) : 0;
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function createAsset(session: Session, input: CreateAssetInput) {
  return prisma.$transaction(async (tx) => {
    const assetTag = input.assetTag?.trim()
      ? input.assetTag.trim()
      : await generateAssetTag(tx);

    const existing = await tx.asset.findUnique({ where: { assetTag } });
    if (existing) throw new Error(`"${assetTag}" etiket numarası zaten kullanılıyor`);

    const asset = await tx.asset.create({
      data: {
        assetTag,
        name: input.name,
        brand: input.brand,
        model: input.model,
        serialNumber: input.serialNumber,
        groupId: input.groupId,
        currentWarehouseId: input.currentWarehouseId,
        currentAssigneeId: input.currentAssigneeId || null,
        status: input.status,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
        notes: input.notes,
      },
    });

    // İlk kayıt hareketi (KAYIT) — başlangıç konumu ve varsa zimmet kaydedilir.
    await tx.assetMovement.create({
      data: {
        assetId: asset.id,
        type: "KAYIT",
        toWarehouseId: asset.currentWarehouseId,
        toAssigneeId: asset.currentAssigneeId,
        newStatus: asset.status,
        performedByUserId: session.user.id,
        note: "Demirbaş kaydı oluşturuldu",
      },
    });

    return asset;
  });
}

export type AssetListFilters = {
  warehouseId?: string;
  groupId?: string;
  status?: string;
  assigned?: string; // "yes" | "no"
  assigneeId?: string;
  search?: string;
  includeArchived?: boolean;
};

export function listAssets(filters: AssetListFilters) {
  const where: Prisma.AssetWhereInput = {
    ...(filters.includeArchived ? {} : { archived: false }),
    ...(filters.warehouseId ? { currentWarehouseId: filters.warehouseId } : {}),
    ...(filters.groupId ? { groupId: filters.groupId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.assigned === "yes" ? { currentAssigneeId: { not: null } } : {}),
    ...(filters.assigned === "no" ? { currentAssigneeId: null } : {}),
    ...(filters.assigneeId ? { currentAssigneeId: filters.assigneeId } : {}),
    ...(filters.search
      ? {
          OR: [
            { assetTag: { contains: filters.search, mode: "insensitive" } },
            { name: { contains: filters.search, mode: "insensitive" } },
            { brand: { contains: filters.search, mode: "insensitive" } },
            { serialNumber: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.asset.findMany({
    where,
    include: { group: true, currentWarehouse: true, currentAssignee: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getAssetDetail(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      group: true,
      currentWarehouse: true,
      currentAssignee: true,
      movements: {
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          fromAssignee: true,
          toAssignee: true,
          performedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateAsset(id: string, input: UpdateAssetInput) {
  const clash = await prisma.asset.findFirst({
    where: { assetTag: input.assetTag, id: { not: id } },
    select: { id: true },
  });
  if (clash) throw new Error(`"${input.assetTag}" etiket numarası başka bir demirbaşta kullanılıyor`);

  return prisma.asset.update({
    where: { id },
    data: {
      assetTag: input.assetTag,
      name: input.name,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber,
      groupId: input.groupId,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      notes: input.notes,
    },
  });
}

// Kalıcı silme yok: arşivleme demirbaşı listelerden gizler, hareket geçmişi kalır.
export async function archiveAsset(session: Session, id: string, archived: boolean) {
  const asset = await prisma.asset.update({
    where: { id },
    data: { archived },
  });
  await logAudit(prisma, {
    userId: session.user.id,
    action: archived ? "asset_archived" : "asset_unarchived",
    entityType: "Asset",
    entityId: id,
    details: { assetTag: asset.assetTag, name: asset.name },
  });
  return asset;
}

// --- İşlemler (her biri hareket geçmişine kayıt düşer) ---

// Depolar arası transfer: bir veya birden fazla demirbaşın konumunu değiştirir.
export async function transferAssets(
  session: Session,
  assetIds: string[],
  toWarehouseId: string,
  note?: string
) {
  if (assetIds.length === 0) throw new Error("Demirbaş seçilmedi");

  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findUnique({ where: { id: toWarehouseId } });
    if (!warehouse) throw new Error("Hedef depo bulunamadı");

    const assets = await tx.asset.findMany({ where: { id: { in: assetIds } } });
    for (const asset of assets) {
      if (asset.currentWarehouseId === toWarehouseId) continue; // aynı depoya taşımayı atla
      await tx.asset.update({
        where: { id: asset.id },
        data: { currentWarehouseId: toWarehouseId },
      });
      await tx.assetMovement.create({
        data: {
          assetId: asset.id,
          type: "TRANSFER",
          fromWarehouseId: asset.currentWarehouseId,
          toWarehouseId,
          performedByUserId: session.user.id,
          note,
        },
      });
    }
  });
}

// Zimmet atama / değiştirme: zaten zimmetliyse devir olarak kaydedilir.
export async function assignAsset(
  session: Session,
  assetId: string,
  toAssigneeId: string,
  note?: string
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    const assignee = await tx.personnel.findUnique({ where: { id: toAssigneeId } });
    if (!assignee) throw new Error("Personel bulunamadı");
    if (asset.currentAssigneeId === toAssigneeId) {
      throw new Error("Demirbaş zaten bu kişiye zimmetli");
    }

    await tx.asset.update({
      where: { id: assetId },
      data: { currentAssigneeId: toAssigneeId },
    });
    await tx.assetMovement.create({
      data: {
        assetId,
        type: "ZIMMET",
        fromAssigneeId: asset.currentAssigneeId,
        toAssigneeId,
        performedByUserId: session.user.id,
        note,
      },
    });
  });
}

// Zimmetten iade (teslim alma): zimmeti boşaltır, istenirse aynı anda bir depoya alır.
export async function returnAsset(
  session: Session,
  assetId: string,
  toWarehouseId?: string,
  note?: string
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    if (!asset.currentAssigneeId) throw new Error("Demirbaş zaten zimmetsiz");

    const warehouseChanges = toWarehouseId && toWarehouseId !== asset.currentWarehouseId;

    await tx.asset.update({
      where: { id: assetId },
      data: {
        currentAssigneeId: null,
        ...(warehouseChanges ? { currentWarehouseId: toWarehouseId } : {}),
      },
    });
    await tx.assetMovement.create({
      data: {
        assetId,
        type: "IADE",
        fromAssigneeId: asset.currentAssigneeId,
        ...(warehouseChanges
          ? { fromWarehouseId: asset.currentWarehouseId, toWarehouseId }
          : {}),
        performedByUserId: session.user.id,
        note,
      },
    });
  });
}

// Durum değiştirme (aktif/tamirde/hurda/kayıp) — not zorunlu.
export async function changeAssetStatus(
  session: Session,
  assetId: string,
  newStatus: "aktif" | "tamirde" | "hurda" | "kayip",
  note: string
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    if (asset.status === newStatus) throw new Error("Demirbaş zaten bu durumda");

    await tx.asset.update({ where: { id: assetId }, data: { status: newStatus } });
    await tx.assetMovement.create({
      data: {
        assetId,
        type: "DURUM",
        oldStatus: asset.status,
        newStatus,
        performedByUserId: session.user.id,
        note,
      },
    });
  });
}

export type InventoryDashboardStats = {
  total: number;
  assigned: number;
  unassigned: number;
  byStatus: Record<string, number>;
  byWarehouse: { warehouseId: string; name: string; count: number }[];
};

export async function getInventoryDashboardStats(): Promise<InventoryDashboardStats> {
  const where: Prisma.AssetWhereInput = { archived: false };

  const [total, assigned, statusGroups, warehouseGroups, warehouses] =
    await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.count({ where: { ...where, currentAssigneeId: { not: null } } }),
      prisma.asset.groupBy({ by: ["status"], where, _count: true }),
      prisma.asset.groupBy({ by: ["currentWarehouseId"], where, _count: true }),
      prisma.warehouse.findMany({ select: { id: true, name: true } }),
    ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusGroups) byStatus[row.status] = row._count;

  const warehouseName = new Map(warehouses.map((w) => [w.id, w.name]));
  const byWarehouse = warehouseGroups
    .map((row) => ({
      warehouseId: row.currentWarehouseId,
      name: warehouseName.get(row.currentWarehouseId) ?? "-",
      count: row._count,
    }))
    .sort((a, b) => b.count - a.count);

  return { total, assigned, unassigned: total - assigned, byStatus, byWarehouse };
}
