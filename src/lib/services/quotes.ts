import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateQuoteInput } from "@/lib/validations/quote";
import type { Session } from "next-auth";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export type UploadedFile = {
  buffer: Buffer<ArrayBuffer>;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: dosya boyutu 10MB'ı aşamaz`;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `${file.name}: sadece PDF, JPG veya PNG dosyaları yüklenebilir`;
  }
  return null;
}

export async function addQuote(
  session: Session,
  requestId: string,
  input: CreateQuoteInput,
  files: UploadedFile[]
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    if (!["submitted", "quotes_collecting"].includes(request.status)) {
      throw new Error("Bu talebe artık teklif eklenemez");
    }

    const entryType = files.length > 0 ? "both" : "manual";

    const quote = await tx.quote.create({
      data: {
        requestId,
        supplierName: input.supplierName,
        supplierContact: input.supplierContact,
        price: input.price,
        currency: input.currency,
        paymentTerms: input.paymentTerms,
        deliveryTime: input.deliveryTime,
        notes: input.notes,
        entryType,
        enteredByUserId: session.user.id,
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

    if (request.status === "submitted") {
      await tx.purchaseRequest.update({
        where: { id: requestId },
        data: { status: "quotes_collecting" },
      });
    }

    await logAudit(tx, {
      userId: session.user.id,
      action: "quote_added",
      entityType: "PurchaseRequest",
      entityId: requestId,
      details: { quoteId: quote.id, supplierName: quote.supplierName },
    });

    return quote;
  });
}

export async function getQuoteAttachment(attachmentId: string) {
  return prisma.quoteAttachment.findUnique({ where: { id: attachmentId } });
}
