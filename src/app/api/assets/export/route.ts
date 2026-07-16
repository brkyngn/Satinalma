import ExcelJS from "exceljs";
import { requireApiRole } from "@/lib/rbac";
import { INVENTORY_VIEW_ROLES, ASSET_STATUS_LABELS, WAREHOUSE_TYPE_LABELS } from "@/lib/constants";
import { listAssets } from "@/lib/services/assets";

// GET: filtrelenmiş demirbaş listesini Excel (.xlsx) olarak dışa aktarır.
export async function GET(request: Request) {
  const result = await requireApiRole(INVENTORY_VIEW_ROLES);
  if (!result.ok) return result.response;

  const url = new URL(request.url);
  const assets = await listAssets({
    warehouseId: url.searchParams.get("warehouseId") ?? undefined,
    groupId: url.searchParams.get("groupId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    assigned: url.searchParams.get("assigned") ?? undefined,
    assigneeId: url.searchParams.get("assigneeId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Demirbaşlar");
  sheet.columns = [
    { header: "Demirbaş No", key: "assetTag", width: 14 },
    { header: "Tanım", key: "name", width: 32 },
    { header: "Marka", key: "brand", width: 16 },
    { header: "Model", key: "model", width: 16 },
    { header: "Seri No", key: "serialNumber", width: 18 },
    { header: "Grup Adı", key: "group", width: 20 },
    { header: "Depo / Konum", key: "warehouse", width: 20 },
    { header: "Konum Tipi", key: "warehouseType", width: 14 },
    { header: "Zimmetli Kişi", key: "assignee", width: 22 },
    { header: "Durum", key: "status", width: 12 },
    { header: "Alış Tarihi", key: "purchaseDate", width: 14 },
    { header: "Not", key: "notes", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const asset of assets) {
    sheet.addRow({
      assetTag: asset.assetTag,
      name: asset.name,
      brand: asset.brand ?? "",
      model: asset.model ?? "",
      serialNumber: asset.serialNumber ?? "",
      group: asset.group.name,
      warehouse: asset.currentWarehouse.name,
      warehouseType: WAREHOUSE_TYPE_LABELS[asset.currentWarehouse.type] ?? asset.currentWarehouse.type,
      assignee: asset.currentAssignee?.fullName ?? "",
      status: ASSET_STATUS_LABELS[asset.status] ?? asset.status,
      purchaseDate: asset.purchaseDate
        ? new Intl.DateTimeFormat("tr-TR").format(asset.purchaseDate)
        : "",
      notes: asset.notes ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `demirbas-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
