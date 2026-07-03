import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/rbac";
import { getQuoteAttachment } from "@/lib/services/quotes";

// GET: teklif dosyasını (PDF/resim) veritabanından okuyup binary olarak döner.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const result = await requireApiSession();
  if (!result.ok) return result.response;

  const { id, attachmentId } = await params;
  const attachment = await getQuoteAttachment(attachmentId);
  if (!attachment || attachment.quoteId !== id) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(attachment.fileData), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
    },
  });
}
