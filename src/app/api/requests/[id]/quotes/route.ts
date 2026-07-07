import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { createQuoteSchema, type QuoteItemPriceInput } from "@/lib/validations/quote";
import { addQuote, validateFile, type UploadedFile } from "@/lib/services/quotes";

// POST: talebe teklif ekler (purchasing) — manuel alanlar + dosya yükleme (multipart/form-data).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireApiRole(["purchasing"]);
  if (!result.ok) return result.response;

  const { id } = await params;
  const formData = await request.formData();

  const parsed = createQuoteSchema.safeParse({
    supplierName: formData.get("supplierName"),
    supplierContact: formData.get("supplierContact") || undefined,
    price: formData.get("price"),
    currency: formData.get("currency"),
    paymentTerms: formData.get("paymentTerms") || undefined,
    deliveryTime: formData.get("deliveryTime") || undefined,
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

  // Kalem bazlı birim fiyatlar itemPrice_<itemId> alanlarıyla gelir; addQuote
  // içinde itemId'lerin bu talebe ait olduğu ayrıca doğrulanır.
  const itemPrices: QuoteItemPriceInput[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("itemPrice_")) continue;
    if (typeof value !== "string" || value.trim() === "") continue;
    const unitPrice = Number(value);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json(
        { error: "Kalem birim fiyatı geçersiz" },
        { status: 400 }
      );
    }
    itemPrices.push({ itemId: key.slice("itemPrice_".length), unitPrice });
  }

  try {
    const quote = await addQuote(result.session, id, parsed.data, files, itemPrices);
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teklif eklenemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
