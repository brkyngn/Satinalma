import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { submitRequestForApproval } from "@/lib/services/requests";

// POST: toplanan teklifleri onaya sunar (purchasing): quotes_collecting -> pending_approval.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireApiRole(["purchasing"]);
  if (!result.ok) return result.response;

  const { id } = await params;
  try {
    const updated = await submitRequestForApproval(result.session, id);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem gerçekleştirilemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
