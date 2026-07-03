import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { createDeliveryAcceptanceSchema } from "@/lib/validations/delivery";
import { createDeliveryAcceptance } from "@/lib/services/delivery-acceptances";
import { validateFile, type UploadedFile } from "@/lib/services/quotes";

// POST: şantiye kabul kaydı (site_manager) — miktar, durum, not, fotoğraf.
export async function POST(request: Request) {
  const result = await requireApiRole(["site_manager"]);
  if (!result.ok) return result.response;

  const formData = await request.formData();
  const deliveryId = formData.get("deliveryId");
  if (typeof deliveryId !== "string" || !deliveryId) {
    return NextResponse.json({ error: "deliveryId zorunludur" }, { status: 400 });
  }

  const parsed = createDeliveryAcceptanceSchema.safeParse({
    acceptedQuantity: formData.get("acceptedQuantity"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const fileEntries = formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  for (const file of fileEntries) {
    const fileError = validateFile(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }
  }

  const files: UploadedFile[] = await Promise.all(
    fileEntries.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    }))
  );

  try {
    const acceptance = await createDeliveryAcceptance(
      result.session,
      deliveryId,
      parsed.data,
      files
    );
    return NextResponse.json(acceptance, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kabul kaydı oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
