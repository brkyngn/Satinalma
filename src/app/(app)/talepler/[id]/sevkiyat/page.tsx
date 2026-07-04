import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { createDeliverySchema } from "@/lib/validations/delivery";
import { createDelivery, getApprovedQuoteForRequest } from "@/lib/services/deliveries";
import { getPurchaseRequestDetail } from "@/lib/services/requests";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SevkiyatPage({
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

  const approvedQuote = await getApprovedQuoteForRequest(id);
  if (!approvedQuote) notFound();

  async function kaydet(formData: FormData) {
    "use server";
    const session = await requirePageRole(["purchasing"]);

    const parsed = createDeliverySchema.safeParse({
      quoteId: formData.get("quoteId"),
      shippedDate: formData.get("shippedDate"),
      waybillNumber: formData.get("waybillNumber"),
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      redirect(`/talepler/${id}/sevkiyat?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    try {
      await createDelivery(session, id, parsed.data);
    } catch (serviceError) {
      const message =
        serviceError instanceof Error ? serviceError.message : "Sevkiyat kaydedilemedi";
      redirect(`/talepler/${id}/sevkiyat?error=${encodeURIComponent(message)}`);
    }

    redirect(`/talepler/${id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Sevkiyat Girişi</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {request.requestNumber} — {request.title} · Onaylanan tedarikçi: {approvedQuote.supplierName}
      </p>

      <form action={kaydet} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <input type="hidden" name="quoteId" value={approvedQuote.id} />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Sevk Tarihi</label>
          <input
            name="shippedDate"
            type="date"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">İrsaliye No</label>
          <input
            name="waybillNumber"
            required
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton
          pendingText="Kaydediliyor..."
          className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
        >
          Sevkiyatı Kaydet
        </SubmitButton>
      </form>
    </div>
  );
}
