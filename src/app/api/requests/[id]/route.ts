import { NextResponse } from "next/server";
import { requireApiSession, requireApiRole } from "@/lib/rbac";
import { getPurchaseRequestDetail, deletePurchaseRequest } from "@/lib/services/requests";

// GET: talep detayı (kalemler, teklifler, onay geçmişi, sevkiyat/teslimat), herhangi bir role açık.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireApiSession();
  if (!result.ok) return result.response;

  const { id } = await params;
  const detail = await getPurchaseRequestDetail(result.session, id);
  if (!detail) {
    return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

// DELETE: talebi ve bağlı tüm kayıtlarını siler (admin).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireApiRole(["admin"]);
  if (!result.ok) return result.response;

  const { id } = await params;
  try {
    await deletePurchaseRequest(result.session, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Talep silinemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
