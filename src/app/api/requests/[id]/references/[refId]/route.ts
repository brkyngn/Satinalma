import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/rbac";
import { getRequestReference } from "@/lib/services/requests";

// GET: talep referans dosyasını (resim/PDF) veritabanından okuyup binary döner.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; refId: string }> }
) {
  const result = await requireApiSession();
  if (!result.ok) return result.response;

  const { id, refId } = await params;
  const reference = await getRequestReference(refId);
  if (
    !reference ||
    reference.requestId !== id ||
    reference.kind !== "file" ||
    !reference.fileData ||
    !reference.mimeType
  ) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(reference.fileData), {
    headers: {
      "Content-Type": reference.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(reference.fileName ?? "referans")}"`,
    },
  });
}
