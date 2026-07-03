import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateDeliveryInput } from "@/lib/validations/delivery";
import type { Session } from "next-auth";

export async function createDelivery(
  session: Session,
  requestId: string,
  input: CreateDeliveryInput
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    if (request.status !== "approved") {
      throw new Error("Sevkiyat sadece onaylanmış taleplere girilebilir");
    }

    const quote = await tx.quote.findFirst({
      where: { id: input.quoteId, requestId },
    });
    if (!quote) throw new Error("Teklif bu talebe ait değil");

    const delivery = await tx.delivery.create({
      data: {
        requestId,
        quoteId: input.quoteId,
        shippedDate: input.shippedDate,
        waybillNumber: input.waybillNumber,
        shippedByUserId: session.user.id,
        notes: input.notes,
      },
    });

    await tx.purchaseRequest.update({
      where: { id: requestId },
      data: { status: "shipped" },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "delivery_created",
      entityType: "PurchaseRequest",
      entityId: requestId,
      details: { deliveryId: delivery.id, waybillNumber: delivery.waybillNumber },
    });

    return delivery;
  });
}

export async function getApprovedQuoteForRequest(requestId: string) {
  const approval = await prisma.approval.findFirst({
    where: { requestId, decision: "approved" },
    include: { selectedQuote: true },
    orderBy: { decidedAt: "desc" },
  });
  return approval?.selectedQuote ?? null;
}

export async function getPendingDeliveryForRequest(requestId: string) {
  return prisma.delivery.findFirst({
    where: { requestId, acceptance: null },
    orderBy: { shippedDate: "desc" },
  });
}
