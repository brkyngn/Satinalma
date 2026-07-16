import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES } from "@/lib/constants";
import {
  parseWorkbook,
  buildImportPreview,
  commitImport,
} from "@/lib/services/assetImport";

const MAX_SIZE = 10 * 1024 * 1024;

// POST: Excel içe aktarma. mode=preview → doğrulama/önizleme; mode=commit → kayıt.
// Her iki modda da yüklenen dosya sunucuda yeniden ayrıştırılır (istemci
// verisine güvenilmez).
export async function POST(request: Request) {
  const result = await requireApiRole(INVENTORY_MANAGE_ROLES);
  if (!result.ok) return result.response;

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = String(formData.get("mode") || "preview");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Dosya seçilmedi" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Dosya boyutu 10MB'ı aşamaz" }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Lütfen .xlsx uzantılı bir Excel dosyası yükleyin" },
      { status: 400 }
    );
  }

  let rows;
  try {
    rows = await parseWorkbook(await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Dosya okunamadı" },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Dosyada veri satırı bulunamadı" }, { status: 400 });
  }

  if (mode === "commit") {
    const autoCreatePersonnel = formData.get("autoCreatePersonnel") === "true";
    try {
      const summary = await commitImport(result.session, rows, { autoCreatePersonnel });
      return NextResponse.json(summary);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "İçe aktarma başarısız" },
        { status: 400 }
      );
    }
  }

  const preview = await buildImportPreview(rows);
  return NextResponse.json(preview);
}
