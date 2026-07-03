import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateDeliveryAcceptanceInput } from "@/lib/validations/delivery";
import type { UploadedFile } from "@/lib/services/quotes";
import type { Session } from "next-auth";

export async function createDeliveryAcceptance(
  session: Session,
  deliveryId: string,
  input: CreateDeliveryAcceptanceInput,
  files: UploadedFile[]
) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { request: true, acceptance: true },
    });

    if (delivery.request.status !== "shipped") {
      throw new Error("Bu sevkiyat için kabul kaydı zaten girilmiş veya sevkiyat bekleniyor");
    }
    if (delivery.acceptance) {
      throw new Error("Bu sevkiyat için zaten bir kabul kaydı var");
    }

    const acceptance = await tx.deliveryAcceptance.create({
      data: {
        deliveryId,
        acceptedByUserId: session.user.id,
        acceptedQuantity: input.acceptedQuantity,
        status: input.status,
        notes: input.notes,
        attachments: {
          create: files.map((file) => ({
            fileData: file.buffer,
            fileName: file.fileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
          })),
        },
      },
    });

    const nextStatus =
      input.status === "full"
        ? "accepted"
        : input.status === "partial"
          ? "partially_accepted"
          : "shipped"; // reddedilen teslimat: manuel takip gerektiren istisna durumu

    await tx.purchaseRequest.update({
      where: { id: delivery.requestId },
      data: { status: nextStatus },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "delivery_accepted",
      entityType: "PurchaseRequest",
      entityId: delivery.requestId,
      details: { deliveryId, status: input.status, acceptedQuantity: input.acceptedQuantity },
    });

    return acceptance;
  });
}

export async function getDeliveryAcceptanceAttachment(attachmentId: string) {
  return prisma.deliveryAcceptanceAttachment.findUnique({ where: { id: attachmentId } });
}
