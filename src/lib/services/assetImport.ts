import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import type { Prisma } from "../../../generated/prisma/client";

// --- Başlık (kolon) eşleştirme: büyük/küçük harf, boşluk ve Türkçe karakter toleranslı ---

function normalizeHeader(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ğ", "g")
    .replace(/[^a-z0-9]/g, "");
}

type Field =
  | "assetTag"
  | "name"
  | "brand"
  | "model"
  | "serialNumber"
  | "group"
  | "warehouse"
  | "assignee";

const HEADER_ALIASES: Record<Field, string[]> = {
  assetTag: ["demirbasno", "demirbas", "etiket", "etiketno", "no", "envanterno"],
  name: ["tanim", "ad", "adi", "malzeme", "urun"],
  brand: ["marka"],
  model: ["model"],
  serialNumber: ["serino", "serinumarasi", "seri"],
  group: ["grup", "grupadi", "kategori"],
  warehouse: ["depo", "konum", "depokonum", "lokasyon"],
  assignee: ["zimmetlikisi", "zimmet", "personel", "kisi", "zimmetli"],
};

function matchField(header: string): Field | null {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [Field, string[]][]) {
    if (aliases.includes(norm)) return field;
  }
  return null;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("").trim();
    }
    if ("result" in value) return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

export type RawRow = {
  rowNumber: number;
  assetTag: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  group: string;
  warehouse: string;
  assignee: string;
};

export async function parseWorkbook(buffer: ArrayBuffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Excel dosyasında sayfa bulunamadı");

  // Başlık satırındaki her kolonu bir alana eşleştir.
  const colToField = new Map<number, Field>();
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const field = matchField(cellText(cell.value));
    if (field) colToField.set(colNumber, field);
  });

  const rows: RawRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const data: Record<Field, string> = {
      assetTag: "", name: "", brand: "", model: "",
      serialNumber: "", group: "", warehouse: "", assignee: "",
    };
    let hasAny = false;
    for (const [col, field] of colToField) {
      const text = cellText(row.getCell(col).value);
      data[field] = text;
      if (text) hasAny = true;
    }
    if (!hasAny) continue; // tamamen boş satırı atla
    rows.push({ rowNumber: r, ...data });
  }
  return rows;
}

// --- Doğrulama / önizleme ---

export type PreviewRow = RawRow & {
  status: "valid" | "invalid" | "warning";
  messages: string[];
  matchedGroupId?: string;
  matchedWarehouseId?: string;
  matchedAssigneeId?: string;
  needsNewPersonnel?: boolean;
};

export type ImportPreview = {
  rows: PreviewRow[];
  validCount: number;
  invalidCount: number;
  unknownGroups: string[];
  unknownWarehouses: string[];
  unknownPersonnel: string[];
};

function lower(v: string) {
  return v.toLocaleLowerCase("tr").trim();
}

export async function buildImportPreview(rows: RawRow[]): Promise<ImportPreview> {
  const [groups, warehouses, personnel] = await Promise.all([
    prisma.assetGroup.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.warehouse.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.personnel.findMany({ where: { active: true }, select: { id: true, fullName: true } }),
  ]);
  const groupByName = new Map(groups.map((g) => [lower(g.name), g.id]));
  const warehouseByName = new Map(warehouses.map((w) => [lower(w.name), w.id]));
  const personnelByName = new Map(personnel.map((p) => [lower(p.fullName), p.id]));

  const existingTags = new Set(
    (await prisma.asset.findMany({ select: { assetTag: true } })).map((a) => a.assetTag)
  );

  const unknownGroups = new Set<string>();
  const unknownWarehouses = new Set<string>();
  const unknownPersonnel = new Set<string>();
  const seenTags = new Set<string>();

  const previewRows: PreviewRow[] = rows.map((row) => {
    const messages: string[] = [];

    if (!row.name) messages.push("Tanım boş");

    let matchedGroupId: string | undefined;
    if (!row.group) {
      messages.push("Grup boş");
    } else {
      matchedGroupId = groupByName.get(lower(row.group));
      if (!matchedGroupId) {
        messages.push(`Grup tanımlı değil: "${row.group}"`);
        unknownGroups.add(row.group);
      }
    }

    let matchedWarehouseId: string | undefined;
    if (!row.warehouse) {
      messages.push("Depo/konum boş");
    } else {
      matchedWarehouseId = warehouseByName.get(lower(row.warehouse));
      if (!matchedWarehouseId) {
        messages.push(`Depo tanımlı değil: "${row.warehouse}"`);
        unknownWarehouses.add(row.warehouse);
      }
    }

    if (row.assetTag) {
      if (existingTags.has(row.assetTag) || seenTags.has(row.assetTag)) {
        messages.push(`Etiket no zaten kullanılıyor: "${row.assetTag}"`);
      }
      seenTags.add(row.assetTag);
    }

    let matchedAssigneeId: string | undefined;
    let needsNewPersonnel = false;
    if (row.assignee) {
      matchedAssigneeId = personnelByName.get(lower(row.assignee));
      if (!matchedAssigneeId) {
        needsNewPersonnel = true;
        unknownPersonnel.add(row.assignee);
      }
    }

    const isInvalid = messages.length > 0;
    const status: PreviewRow["status"] = isInvalid
      ? "invalid"
      : needsNewPersonnel
        ? "warning"
        : "valid";

    return {
      ...row,
      status,
      messages,
      matchedGroupId,
      matchedWarehouseId,
      matchedAssigneeId,
      needsNewPersonnel,
    };
  });

  return {
    rows: previewRows,
    validCount: previewRows.filter((r) => r.status !== "invalid").length,
    invalidCount: previewRows.filter((r) => r.status === "invalid").length,
    unknownGroups: [...unknownGroups],
    unknownWarehouses: [...unknownWarehouses],
    unknownPersonnel: [...unknownPersonnel],
  };
}

// --- Kayıt (commit) ---

export type ImportResult = { created: number; skipped: number; createdPersonnel: number };

async function nextTagSequence(tx: Prisma.TransactionClient) {
  const latest = await tx.asset.findFirst({
    where: { assetTag: { startsWith: "DMB-" } },
    orderBy: { assetTag: "desc" },
    select: { assetTag: true },
  });
  const last = latest ? Number(latest.assetTag.slice(4)) : 0;
  return Number.isFinite(last) ? last : 0;
}

export async function commitImport(
  session: Session,
  rows: RawRow[],
  options: { autoCreatePersonnel: boolean }
): Promise<ImportResult> {
  const preview = await buildImportPreview(rows);

  return prisma.$transaction(async (tx) => {
    let seq = await nextTagSequence(tx);
    let created = 0;
    let skipped = 0;
    let createdPersonnel = 0;

    // Aynı isimli yeni personeli tek sefer oluşturmak için önbellek.
    const newPersonnelCache = new Map<string, string>();

    for (const row of preview.rows) {
      if (row.status === "invalid") {
        skipped++;
        continue;
      }

      let assigneeId = row.matchedAssigneeId ?? null;
      if (row.needsNewPersonnel && row.assignee) {
        if (!options.autoCreatePersonnel) {
          // Personel oluşturulmayacaksa demirbaş zimmetsiz aktarılır.
          assigneeId = null;
        } else {
          const key = lower(row.assignee);
          if (newPersonnelCache.has(key)) {
            assigneeId = newPersonnelCache.get(key)!;
          } else {
            const person = await tx.personnel.create({
              data: { fullName: row.assignee, active: true },
            });
            newPersonnelCache.set(key, person.id);
            assigneeId = person.id;
            createdPersonnel++;
          }
        }
      }

      const assetTag = row.assetTag || `DMB-${String(++seq).padStart(4, "0")}`;

      const asset = await tx.asset.create({
        data: {
          assetTag,
          name: row.name,
          brand: row.brand || null,
          model: row.model || null,
          serialNumber: row.serialNumber || null,
          groupId: row.matchedGroupId!,
          currentWarehouseId: row.matchedWarehouseId!,
          currentAssigneeId: assigneeId,
          status: "aktif",
        },
      });

      await tx.assetMovement.create({
        data: {
          assetId: asset.id,
          type: "KAYIT",
          toWarehouseId: asset.currentWarehouseId,
          toAssigneeId: asset.currentAssigneeId,
          newStatus: "aktif",
          performedByUserId: session.user.id,
          note: "Excel ile içe aktarıldı",
        },
      });
      created++;
    }

    return { created, skipped, createdPersonnel };
  });
}
