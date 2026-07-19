import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/rbac";
import { createRequestSchema, referenceLinkSchema } from "@/lib/validations/request";
import { createPurchaseRequest, type CreateReferences } from "@/lib/services/requests";
import { validateFile, type UploadedFile } from "@/lib/services/quotes";
import { listProjects } from "@/lib/services/projects";
import { RequestItemsFields } from "@/components/RequestItemsFields";
import { RequestReferences } from "@/components/RequestReferences";
import { SubmitButton } from "@/components/SubmitButton";

export default async function YeniTalepPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePageRole(["requester"]);
  const { error } = await searchParams;
  const projects = await listProjects();

  async function olustur(formData: FormData) {
    "use server";
    const session = await requirePageRole(["requester"]);

    const productNames = formData.getAll("productName");
    const quantities = formData.getAll("quantity");
    const units = formData.getAll("unit");
    const specNotes = formData.getAll("specNote");

    const items = productNames.map((productName, index) => ({
      productName,
      quantity: quantities[index],
      unit: units[index],
      specNote: specNotes[index] || undefined,
    }));

    const parsed = createRequestSchema.safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      neededByDate: formData.get("neededByDate") || undefined,
      items,
    });

    if (!parsed.success) {
      redirect(`/talepler/yeni?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
    }

    // Referans bağlantıları (refLink alanları JSON olarak taşınır)
    const links: { url: string; label?: string }[] = [];
    for (const entry of formData.getAll("refLink")) {
      try {
        const linkParsed = referenceLinkSchema.safeParse(JSON.parse(String(entry)));
        if (linkParsed.success) links.push(linkParsed.data);
      } catch {
        // geçersiz JSON'u sessizce atla
      }
    }

    // Referans dosyaları (resim/PDF) — refFiles ile aynı sırada refFileLabel
    const refFileEntries = formData
      .getAll("refFiles")
      .filter((e): e is File => e instanceof File && e.size > 0);
    const refFileLabels = formData.getAll("refFileLabel").map(String);
    for (const f of refFileEntries) {
      const fileError = validateFile(f);
      if (fileError) {
        redirect(`/talepler/yeni?error=${encodeURIComponent(fileError)}`);
      }
    }
    const files = await Promise.all(
      refFileEntries.map(async (f, index) => ({
        file: {
          buffer: Buffer.from(await f.arrayBuffer()),
          fileName: f.name,
          mimeType: f.type,
          fileSize: f.size,
        } as UploadedFile,
        label: refFileLabels[index] || undefined,
      }))
    );

    const references: CreateReferences = { links, files };

    const request = await createPurchaseRequest(session, parsed.data, references);
    redirect(`/talepler/${request.id}`);
  }

  void session;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Yeni Satın Alma Talebi</h1>

      <form action={olustur} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Proje / Şantiye</label>
          <select
            name="projectId"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Seçiniz</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Talep Başlığı</label>
          <input
            name="title"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Açıklama</label>
          <textarea
            name="description"
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Gerekli Tarih</label>
          <input
            name="neededByDate"
            type="date"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-zinc-700">Kalemler</span>
          <RequestItemsFields />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-zinc-700">
            Referanslar{" "}
            <span className="text-zinc-400">(ürün detayı için bağlantı, resim veya PDF)</span>
          </span>
          <RequestReferences />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton
          pendingText="Kaydediliyor..."
          className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
        >
          Talebi Oluştur
        </SubmitButton>
      </form>
    </div>
  );
}
