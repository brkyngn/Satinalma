import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { createApprovalSchema } from "@/lib/validations/approval";
import { decideApproval } from "@/lib/services/approvals";
import { getPurchaseRequestDetail } from "@/lib/services/requests";
import { formatMoney } from "@/lib/utils";
import { SubmitButton } from "@/components/SubmitButton";

export default async function OnayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePageRole(["approver"]);
  const { id } = await params;
  const { error } = await searchParams;

  const request = await getPurchaseRequestDetail(session, id);
  if (!request) notFound();

  async function karaVer(formData: FormData) {
    "use server";
    const session = await requirePageRole(["approver"]);

    const parsed = createApprovalSchema.safeParse({
      decision: formData.get("decision"),
      selectedQuoteId: formData.get("selectedQuoteId") || undefined,
      comment: formData.get("comment") || undefined,
    });

    if (!parsed.success) {
      redirect(`/talepler/${id}/onay?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    try {
      await decideApproval(session, id, parsed.data);
    } catch (serviceError) {
      const message =
        serviceError instanceof Error ? serviceError.message : "İşlem gerçekleştirilemedi";
      redirect(`/talepler/${id}/onay?error=${encodeURIComponent(message)}`);
    }

    redirect(`/talepler/${id}`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Onay</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {request.requestNumber} — {request.title}
      </p>

      <form action={karaVer} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <span className="mb-2 block text-sm font-medium text-zinc-700">Teklif Karşılaştırma</span>
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium" />
                  <th className="px-3 py-2 font-medium">Tedarikçi</th>
                  <th className="px-3 py-2 font-medium">Fiyat</th>
                  <th className="px-3 py-2 font-medium">Ödeme</th>
                  <th className="px-3 py-2 font-medium">Teslim Süresi</th>
                </tr>
              </thead>
              <tbody>
                {request.quotes.map((quote, index) => (
                  <tr key={quote.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-3 py-2">
                      <input
                        type="radio"
                        name="selectedQuoteId"
                        value={quote.id}
                        defaultChecked={index === 0}
                      />
                    </td>
                    <td className="px-3 py-2 text-zinc-900">{quote.supplierName}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      {formatMoney(quote.price.toString(), quote.currency)}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{quote.paymentTerms}</td>
                    <td className="px-3 py-2 text-zinc-600">{quote.deliveryTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Yorum</label>
          <textarea
            name="comment"
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <SubmitButton
            name="decision"
            value="approved"
            pendingText="Kaydediliyor..."
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Onayla
          </SubmitButton>
          <SubmitButton
            name="decision"
            value="rejected"
            pendingText="Kaydediliyor..."
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Reddet
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
