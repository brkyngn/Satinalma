import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { createDeliveryAcceptanceSchema } from "@/lib/validations/delivery";
import { createDeliveryAcceptance } from "@/lib/services/delivery-acceptances";
import { getPendingDeliveryForRequest } from "@/lib/services/deliveries";
import { getPurchaseRequestDetail } from "@/lib/services/requests";
import { validateFile, type UploadedFile } from "@/lib/services/quotes";
import { SubmitButton } from "@/components/SubmitButton";

export default async function KabulPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePageRole(["site_manager"]);
  const { id } = await params;
  const { error } = await searchParams;

  const request = await getPurchaseRequestDetail(session, id);
  if (!request) notFound();

  const pendingDelivery = await getPendingDeliveryForRequest(id);
  if (!pendingDelivery) notFound();
  const delivery = pendingDelivery;

  async function kaydet(formData: FormData) {
    "use server";
    const session = await requirePageRole(["site_manager"]);

    const parsed = createDeliveryAcceptanceSchema.safeParse({
      acceptedQuantity: formData.get("acceptedQuantity"),
      status: formData.get("status"),
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      redirect(`/talepler/${id}/kabul?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    const fileEntries = formData
      .getAll("attachments")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    for (const file of fileEntries) {
      const fileError = validateFile(file);
      if (fileError) {
        redirect(`/talepler/${id}/kabul?error=${encodeURIComponent(fileError)}`);
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
      await createDeliveryAcceptance(session, delivery.id, parsed.data, files);
    } catch (serviceError) {
      const message =
        serviceError instanceof Error ? serviceError.message : "Kabul kaydı oluşturulamadı";
      redirect(`/talepler/${id}/kabul?error=${encodeURIComponent(message)}`);
    }

    redirect(`/talepler/${id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Şantiye Kabul</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {request.requestNumber} — {request.title} · İrsaliye: {delivery.waybillNumber}
      </p>

      <form action={kaydet} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Kabul Edilen Miktar</label>
          <input
            name="acceptedQuantity"
            type="number"
            step="any"
            min="0"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Durum</label>
          <select
            name="status"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="full">Tam Kabul</option>
            <option value="partial">Kısmi Kabul</option>
            <option value="rejected">Reddedildi</option>
          </select>
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
            Fotoğraf <span className="text-zinc-400">(PDF, JPG, PNG — en fazla 10MB)</span>
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
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Kabulü Kaydet
        </SubmitButton>
      </form>
    </div>
  );
}
