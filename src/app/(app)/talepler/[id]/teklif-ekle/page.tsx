import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { createQuoteSchema, type QuoteItemPriceInput } from "@/lib/validations/quote";
import { addQuote, validateFile, type UploadedFile } from "@/lib/services/quotes";
import { getPurchaseRequestDetail } from "@/lib/services/requests";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";
import { QuoteItemPriceFields } from "@/components/QuoteItemPriceFields";

export default async function TeklifEklePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePageRole(["purchasing"]);
  const { id } = await params;
  const { error } = await searchParams;

  const request = await getPurchaseRequestDetail(session, id);
  if (!request) notFound();

  // Sunucu action'ında talebin kalem kimlikleri kapanış (closure) ile taşınır;
  // her kalem için formda itemPrice_<itemId> alanı okunur.
  const itemIds = request.items.map((item) => item.id);

  async function ekle(formData: FormData) {
    "use server";
    const session = await requirePageRole(["purchasing"]);

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
      redirect(`/talepler/${id}/teklif-ekle?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    // Kalem bazlı birim fiyatlar isteğe bağlıdır; boş bırakılanlar atlanır,
    // dolu olanlar 0'dan küçük olmayan geçerli bir sayı olmalıdır.
    const itemPrices: QuoteItemPriceInput[] = [];
    for (const itemId of itemIds) {
      const raw = formData.get(`itemPrice_${itemId}`);
      if (raw == null || String(raw).trim() === "") continue;
      const unitPrice = Number(raw);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        redirect(
          `/talepler/${id}/teklif-ekle?error=${encodeURIComponent("Kalem birim fiyatı geçersiz")}`
        );
      }
      itemPrices.push({ itemId, unitPrice });
    }

    const fileEntries = formData.getAll("attachments").filter(
      (entry): entry is File => entry instanceof File && entry.size > 0
    );

    for (const file of fileEntries) {
      const fileError = validateFile(file);
      if (fileError) {
        redirect(`/talepler/${id}/teklif-ekle?error=${encodeURIComponent(fileError)}`);
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
      await addQuote(session, id, parsed.data, files, itemPrices);
    } catch (serviceError) {
      const message =
        serviceError instanceof Error ? serviceError.message : "Teklif eklenemedi";
      redirect(`/talepler/${id}/teklif-ekle?error=${encodeURIComponent(message)}`);
    }

    redirect(`/talepler/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Teklif Ekle</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {request.requestNumber} — {request.title}
      </p>

      <form
        action={ekle}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tedarikçi Adı</label>
          <input
            name="supplierName"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tedarikçi İletişim</label>
          <input
            name="supplierContact"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Toplam Teklif Tutarı
            </label>
            <input
              name="price"
              type="number"
              step="any"
              min="0"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Para Birimi</label>
            <select
              name="currency"
              defaultValue={DEFAULT_CURRENCY}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        {request.items.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Kalem Bazlı Birim Fiyatlar{" "}
              <span className="text-zinc-400">(isteğe bağlı)</span>
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              Tedarikçi kalem kalem fiyat verdiyse buraya girin. Boş bırakılan
              kalemler dikkate alınmaz; toplam tutar yukarıdaki alandan geçerlidir.
            </p>
            <QuoteItemPriceFields
              items={request.items.map((item) => ({
                id: item.id,
                productName: item.productName,
                quantity: item.quantity.toString(),
                unit: item.unit,
              }))}
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Ödeme Koşulu</label>
          <input
            name="paymentTerms"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Teslim Süresi</label>
          <input
            name="deliveryTime"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Not</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Dosyalar <span className="text-zinc-400">(PDF, JPG, PNG — en fazla 10MB)</span>
          </label>
          <input
            name="attachments"
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton
          pendingText="Kaydediliyor..."
          className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
        >
          Teklifi Kaydet
        </SubmitButton>
      </form>
    </div>
  );
}
