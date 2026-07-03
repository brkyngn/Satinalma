import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/rbac";
import { getPurchaseRequestDetail } from "@/lib/services/requests";

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
