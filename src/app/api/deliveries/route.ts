import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { createDeliverySchema } from "@/lib/validations/delivery";
import { createDelivery } from "@/lib/services/deliveries";
import { z } from "zod";

const bodySchema = createDeliverySchema.and(z.object({ requestId: z.string().min(1) }));

// POST: sevkiyat bilgisi girişi (purchasing) — sevk tarihi, irsaliye no.
export async function POST(request: Request) {
  const result = await requireApiRole(["purchasing"]);
  if (!result.ok) return result.response;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const delivery = await createDelivery(result.session, parsed.data.requestId, parsed.data);
    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sevkiyat kaydedilemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
