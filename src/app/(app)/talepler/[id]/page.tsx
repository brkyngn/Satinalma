import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession, requirePageRole } from "@/lib/rbac";
import {
  getPurchaseRequestDetail,
  submitRequestForApproval,
  deletePurchaseRequest,
} from "@/lib/services/requests";
import { getRequestThread, addRequestMessage } from "@/lib/services/messages";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { DeleteButton } from "@/components/DeleteButton";
import { SubmitButton } from "@/components/SubmitButton";

export default async function TalepDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msgError?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { msgError } = await searchParams;
  const request = await getPurchaseRequestDetail(session, id);
  if (!request) notFound();

  const thread = await getRequestThread(id);

  const roles = request ? session.user.roles : [];
  const isPurchasing = roles.includes("purchasing");
  const isApprover = roles.includes("approver");
  const isAdmin = roles.includes("admin");

  async function onayaSun() {
    "use server";
    const session = await requireSession();
    await submitRequestForApproval(session, id);
    redirect(`/talepler/${id}`);
  }

  async function sil() {
    "use server";
    const session = await requirePageRole(["admin"]);
    await deletePurchaseRequest(session, id);
    redirect("/talepler");
  }

  async function mesajGonder(formData: FormData) {
    "use server";
    const session = await requireSession();
    try {
      await addRequestMessage(session, id, String(formData.get("body") || ""));
    } catch (e) {
      redirect(`/talepler/${id}?msgError=${encodeURIComponent(e instanceof Error ? e.message : "Mesaj gönderilemedi")}#mesajlar`);
    }
    redirect(`/talepler/${id}#mesajlar`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">
            {request.requestNumber} — {request.title}
          </h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={request.status} />
            {isAdmin && (
              <form action={sil}>
                <DeleteButton
                  confirmText={`${request.requestNumber} numaralı talebi silmek istediğinize emin misiniz? Bu işlem tüm teklif, onay ve sevkiyat kayıtlarını da siler.`}
                />
              </form>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-zinc-600 sm:grid-cols-4">
          <div>
            <dt className="text-zinc-400">Proje</dt>
            <dd>{request.project.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Talep Eden</dt>
            <dd>{request.requester.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Gerekli Tarih</dt>
            <dd>{request.neededByDate ? formatDate(request.neededByDate) : "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Oluşturulma</dt>
            <dd>{formatDate(request.createdAt)}</dd>
          </div>
        </dl>
        {request.description && (
          <p className="mt-3 text-sm text-zinc-600">{request.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {isPurchasing && ["submitted", "quotes_collecting"].includes(request.status) && (
            <Link
              href={`/talepler/${id}/teklif-ekle`}
              className="rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-brand-navy-dark active:scale-[0.97]"
            >
              Teklif Ekle
            </Link>
          )}
          {isPurchasing && request.status === "quotes_collecting" && request.quotes.length > 0 && (
            <form action={onayaSun}>
              <SubmitButton
                pendingText="Gönderiliyor..."
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Onaya Sun
              </SubmitButton>
            </form>
          )}
          {isApprover && request.status === "pending_approval" && (
            <Link
              href={`/talepler/${id}/onay`}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-amber-700 active:scale-[0.97]"
            >
              Değerlendir
            </Link>
          )}
          {isPurchasing && request.status === "approved" && (
            <Link
              href={`/talepler/${id}/sevkiyat`}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-violet-700 active:scale-[0.97]"
            >
              Sevkiyat Gir
            </Link>
          )}
          {roles.includes("site_manager") && request.status === "shipped" && (
            <Link
              href={`/talepler/${id}/kabul`}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-emerald-700 active:scale-[0.97]"
            >
              Teslimatı Kabul Et
            </Link>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Kalemler</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Ürün</th>
                <th className="px-4 py-2 font-medium">Miktar</th>
                <th className="px-4 py-2 font-medium">Birim</th>
                <th className="px-4 py-2 font-medium">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {request.items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2 text-zinc-900">{item.productName}</td>
                  <td className="px-4 py-2 text-zinc-600">{item.quantity.toString()}</td>
                  <td className="px-4 py-2 text-zinc-600">{item.unit}</td>
                  <td className="px-4 py-2 text-zinc-500">{item.specNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {request.references.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Referanslar</h2>
          <div className="flex flex-wrap gap-3">
            {request.references.map((reference) => {
              if (reference.kind === "link") {
                return (
                  <a
                    key={reference.id}
                    href={reference.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-brand-navy hover:border-zinc-300 hover:underline"
                  >
                    🔗 {reference.label || reference.url}
                  </a>
                );
              }
              const href = `/api/requests/${request.id}/references/${reference.id}`;
              const isImage = reference.mimeType?.startsWith("image/");
              return (
                <a
                  key={reference.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-col items-center gap-1 rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-600 hover:border-zinc-300"
                  title={reference.label ?? reference.fileName ?? undefined}
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={href}
                      alt={reference.label ?? reference.fileName ?? "referans"}
                      className="h-24 w-24 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-24 w-24 items-center justify-center rounded bg-zinc-50 text-3xl">
                      📄
                    </span>
                  )}
                  <span className="max-w-24 truncate">
                    {reference.label || reference.fileName}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Teklifler</h2>
        {request.quotes.length === 0 ? (
          <p className="text-sm text-zinc-400">Henüz teklif eklenmedi.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Tedarikçi</th>
                  <th className="px-4 py-2 font-medium">Toplam Tutar</th>
                  <th className="px-4 py-2 font-medium">Ödeme</th>
                  <th className="px-4 py-2 font-medium">Teslim Süresi</th>
                  <th className="px-4 py-2 font-medium">Dosyalar</th>
                  <th className="px-4 py-2 font-medium">Giren</th>
                </tr>
              </thead>
              <tbody>
                {request.quotes.map((quote) => {
                  const isSelected = request.approvals.some(
                    (approval) =>
                      approval.decision === "approved" &&
                      approval.selectedQuoteId === quote.id
                  );
                  return (
                    <Fragment key={quote.id}>
                      <tr
                        className={`border-b border-zinc-100 ${quote.items.length === 0 ? "last:border-0" : ""} ${isSelected ? "bg-emerald-50" : ""}`}
                      >
                        <td className="px-4 py-2 text-zinc-900">
                          {quote.supplierName}
                          {isSelected && (
                            <span className="ml-2 text-xs font-medium text-emerald-700">Seçildi</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-medium text-zinc-800">
                          {formatMoney(quote.price.toString(), quote.currency)}
                        </td>
                        <td className="px-4 py-2 text-zinc-600">{quote.paymentTerms}</td>
                        <td className="px-4 py-2 text-zinc-600">{quote.deliveryTime}</td>
                        <td className="px-4 py-2 text-zinc-600">
                          {quote.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={`/api/quotes/${quote.id}/attachments/${attachment.id}`}
                              className="mr-2 text-zinc-600 underline hover:text-zinc-900"
                            >
                              {attachment.fileName}
                            </a>
                          ))}
                        </td>
                        <td className="px-4 py-2 text-zinc-500">{quote.enteredBy.name}</td>
                      </tr>
                      {quote.items.length > 0 && (
                        <tr className={`border-b border-zinc-100 last:border-0 ${isSelected ? "bg-emerald-50" : ""}`}>
                          <td colSpan={6} className="px-4 pb-3">
                            <div className="overflow-hidden rounded-md border border-zinc-200">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-50 text-zinc-500">
                                  <tr>
                                    <th className="px-3 py-1.5 font-medium">Kalem</th>
                                    <th className="px-3 py-1.5 font-medium">Miktar</th>
                                    <th className="px-3 py-1.5 font-medium">Birim Fiyat</th>
                                    <th className="px-3 py-1.5 text-right font-medium">Satır Tutarı</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quote.items.map((quoteItem) => {
                                    const lineTotal =
                                      Number(quoteItem.unitPrice) * Number(quoteItem.item.quantity);
                                    return (
                                      <tr key={quoteItem.id} className="border-t border-zinc-100">
                                        <td className="px-3 py-1.5 text-zinc-800">
                                          {quoteItem.item.productName}
                                        </td>
                                        <td className="px-3 py-1.5 text-zinc-600">
                                          {quoteItem.item.quantity.toString()} {quoteItem.item.unit}
                                        </td>
                                        <td className="px-3 py-1.5 text-zinc-600">
                                          {formatMoney(quoteItem.unitPrice.toString(), quote.currency)}
                                        </td>
                                        <td className="px-3 py-1.5 text-right text-zinc-700">
                                          {formatMoney(lineTotal, quote.currency)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {request.approvals.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Onay Geçmişi</h2>
          <div className="space-y-2">
            {request.approvals.map((approval) => (
              <div key={approval.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <p className="text-zinc-900">
                  <span className="font-medium">{approval.approver.name}</span> —{" "}
                  {approval.decision === "approved" ? "Onayladı" : "Reddetti"} (
                  {formatDate(approval.decidedAt)})
                </p>
                {approval.comment && <p className="mt-1 text-zinc-600">{approval.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {request.deliveries.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Sevkiyat / Teslimat</h2>
          <div className="space-y-2">
            {request.deliveries.map((delivery) => (
              <div key={delivery.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <p className="text-zinc-900">
                  Sevk tarihi: {formatDate(delivery.shippedDate)} · İrsaliye: {delivery.waybillNumber} ·
                  Sevk eden: {delivery.shippedBy.name}
                </p>
                {delivery.acceptance && (
                  <div className="mt-2 border-t border-zinc-100 pt-2">
                    <p className="text-zinc-900">
                      Kabul: {delivery.acceptance.status === "full"
                        ? "Tam"
                        : delivery.acceptance.status === "partial"
                          ? "Kısmi"
                          : "Reddedildi"}{" "}
                      — {delivery.acceptance.acceptedQuantity.toString()} adet — kabul eden:{" "}
                      {delivery.acceptance.acceptedBy.name}
                    </p>
                    {delivery.acceptance.notes && (
                      <p className="mt-1 text-zinc-600">{delivery.acceptance.notes}</p>
                    )}
                    {delivery.acceptance.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={`/api/delivery-acceptances/${delivery.acceptance!.id}/attachments/${attachment.id}`}
                        className="mr-2 text-zinc-600 underline hover:text-zinc-900"
                      >
                        {attachment.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="mesajlar">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Mesajlar ve Notlar</h2>
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="max-h-96 space-y-3 overflow-y-auto p-4">
            {thread.length === 0 && (
              <p className="text-sm text-zinc-400">Henüz mesaj yok. İlk mesajı siz yazın.</p>
            )}
            {thread.map((item) =>
              item.kind === "system" ? (
                <div key={item.id} className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                    Sistem
                  </span>
                  <span>
                    {item.body}
                    {item.author !== "Sistem" && ` · ${item.author}`} · {formatDateTime(item.createdAt)}
                  </span>
                </div>
              ) : (
                <div key={item.id} className="rounded-md bg-zinc-50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-800">{item.author}</span>
                    <span className="text-xs text-zinc-400">{formatDateTime(item.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-700">{item.body}</p>
                </div>
              )
            )}
          </div>

          <form action={mesajGonder} className="border-t border-zinc-100 p-3">
            <textarea
              name="body"
              rows={2}
              required
              placeholder="Soru sorun veya not ekleyin..."
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            {msgError && <p className="mt-1 text-sm text-brand-red">{msgError}</p>}
            <div className="mt-2 flex justify-end">
              <SubmitButton
                pendingText="Gönderiliyor..."
                className="rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
              >
                Gönder
              </SubmitButton>
            </div>
          </form>
        </div>
      </section>

      <p className="text-xs text-zinc-400">
        Rolünüz: {roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}
      </p>
    </div>
  );
}
