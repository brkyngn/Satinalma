import { NextResponse } from "next/server";
import { requireApiRole, requireApiSession } from "@/lib/rbac";
import { createRequestSchema } from "@/lib/validations/request";
import { createPurchaseRequest, listPurchaseRequests } from "@/lib/services/requests";

// GET: talep listesi (filtrelenebilir, herhangi bir role açık).
export async function GET(request: Request) {
  const result = await requireApiSession();
  if (!result.ok) return result.response;

  const { searchParams } = new URL(request.url);
  const requests = await listPurchaseRequests(result.session, {
    status: searchParams.get("status") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json(requests);
}

// POST: yeni talep oluşturma (requester).
export async function POST(request: Request) {
  const result = await requireApiRole(["requester"]);
  if (!result.ok) return result.response;

  const body = await request.json();
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const created = await createPurchaseRequest(result.session, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
