import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateApprovalInput } from "@/lib/validations/approval";
import type { Session } from "next-auth";

export async function decideApproval(
  session: Session,
  requestId: string,
  input: CreateApprovalInput
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    if (request.status !== "pending_approval") {
      throw new Error("Bu talep onay bekleyen durumda değil");
    }

    if (input.decision === "approved" && input.selectedQuoteId) {
      const quote = await tx.quote.findFirst({
        where: { id: input.selectedQuoteId, requestId },
      });
      if (!quote) throw new Error("Seçilen teklif bu talebe ait değil");
    }

    const approval = await tx.approval.create({
      data: {
        requestId,
        selectedQuoteId:
          input.decision === "approved" ? input.selectedQuoteId : undefined,
        approverId: session.user.id,
        decision: input.decision,
        comment: input.comment,
      },
    });

    const updated = await tx.purchaseRequest.update({
      where: { id: requestId },
      data: { status: input.decision === "approved" ? "approved" : "rejected" },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: input.decision === "approved" ? "request_approved" : "request_rejected",
      entityType: "PurchaseRequest",
      entityId: requestId,
      details: { approvalId: approval.id, comment: input.comment },
    });

    return updated;
  });
}
