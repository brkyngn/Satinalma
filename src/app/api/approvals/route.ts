import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { createApprovalSchema } from "@/lib/validations/approval";
import { decideApproval } from "@/lib/services/approvals";
import { z } from "zod";

const bodySchema = createApprovalSchema.and(z.object({ requestId: z.string().min(1) }));

// POST: teklif onayı/reddi (approver) — seçilen teklif, karar, yorum.
export async function POST(request: Request) {
  const result = await requireApiRole(["approver"]);
  if (!result.ok) return result.response;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const updated = await decideApproval(result.session, parsed.data.requestId, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem gerçekleştirilemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
