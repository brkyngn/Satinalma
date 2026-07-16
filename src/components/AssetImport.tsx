"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PreviewRow = {
  rowNumber: number;
  assetTag: string;
  name: string;
  group: string;
  warehouse: string;
  assignee: string;
  status: "valid" | "invalid" | "warning";
  messages: string[];
};

type Preview = {
  rows: PreviewRow[];
  validCount: number;
  invalidCount: number;
  unknownGroups: string[];
  unknownWarehouses: string[];
  unknownPersonnel: string[];
};

type Result = { created: number; skipped: number; createdPersonnel: number };

const statusStyles: Record<PreviewRow["status"], string> = {
  valid: "bg-emerald-50",
  warning: "bg-amber-50",
  invalid: "bg-red-50",
};

const statusLabels: Record<PreviewRow["status"], string> = {
  valid: "Geçerli",
  warning: "Uyarı",
  invalid: "Hatalı",
};

export function AssetImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoCreatePersonnel, setAutoCreatePersonnel] = useState(false);

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", "preview");
      const res = await fetch("/api/assets/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Önizleme başarısız");
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", "commit");
      fd.set("autoCreatePersonnel", String(autoCreatePersonnel));
      const res = await fetch("/api/assets/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İçe aktarma başarısız");
      setResult(data);
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <p className="mb-3 text-sm text-zinc-600">
          Excel (.xlsx) dosyası yükleyin. Beklenen sütunlar (esnek eşleştirilir):
          <span className="text-zinc-500">
            {" "}Demirbaş No, Tanım, Marka, Model, Seri No, Grup Adı, Depo/Konum, Zimmetli Kişi.
          </span>
          {" "}Grup ve depo değerleri, Tanımlar bölümünde <strong>önceden tanımlı</strong> olmalıdır.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
              setError(null);
            }}
            className="text-sm"
          />
          <button
            type="button"
            onClick={handlePreview}
            disabled={!file || loading}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading && !result ? "İşleniyor..." : "Önizle"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-brand-red">{error}</p>
      )}

      {result && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          İçe aktarma tamamlandı: <strong>{result.created}</strong> demirbaş eklendi
          {result.createdPersonnel > 0 && `, ${result.createdPersonnel} yeni personel oluşturuldu`}
          {result.skipped > 0 && `, ${result.skipped} hatalı satır atlandı`}.
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          {(preview.unknownGroups.length > 0 || preview.unknownWarehouses.length > 0) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Önce Tanımlar bölümünden ekleyin:</p>
              {preview.unknownGroups.length > 0 && (
                <p>Tanımsız gruplar: {preview.unknownGroups.join(", ")}</p>
              )}
              {preview.unknownWarehouses.length > 0 && (
                <p>Tanımsız depolar: {preview.unknownWarehouses.join(", ")}</p>
              )}
            </div>
          )}

          {preview.unknownPersonnel.length > 0 && (
            <label className="flex items-start gap-2 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={autoCreatePersonnel}
                onChange={(e) => setAutoCreatePersonnel(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300"
              />
              <span>
                Listede olmayan personeli otomatik oluştur:{" "}
                <span className="text-zinc-500">{preview.unknownPersonnel.join(", ")}</span>.
                İşaretlenmezse bu satırlar zimmetsiz aktarılır.
              </span>
            </label>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              <span className="text-emerald-700">{preview.validCount} aktarılabilir</span>
              {preview.invalidCount > 0 && (
                <span className="text-brand-red"> · {preview.invalidCount} hatalı</span>
              )}
            </p>
            <button
              type="button"
              onClick={handleCommit}
              disabled={loading || preview.validCount === 0}
              className="rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-navy-dark active:scale-[0.97] disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : `Onayla ve Kaydet (${preview.validCount})`}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Satır</th>
                  <th className="px-3 py-2 font-medium">Durum</th>
                  <th className="px-3 py-2 font-medium">Etiket</th>
                  <th className="px-3 py-2 font-medium">Tanım</th>
                  <th className="px-3 py-2 font-medium">Grup</th>
                  <th className="px-3 py-2 font-medium">Depo</th>
                  <th className="px-3 py-2 font-medium">Zimmet</th>
                  <th className="px-3 py-2 font-medium">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className={`border-b border-zinc-100 last:border-0 ${statusStyles[row.status]}`}>
                    <td className="px-3 py-2 text-zinc-500">{row.rowNumber}</td>
                    <td className="px-3 py-2 font-medium text-zinc-700">{statusLabels[row.status]}</td>
                    <td className="px-3 py-2 text-zinc-600">{row.assetTag || <span className="text-zinc-400">oto</span>}</td>
                    <td className="px-3 py-2 text-zinc-800">{row.name}</td>
                    <td className="px-3 py-2 text-zinc-600">{row.group}</td>
                    <td className="px-3 py-2 text-zinc-600">{row.warehouse}</td>
                    <td className="px-3 py-2 text-zinc-600">{row.assignee}</td>
                    <td className="px-3 py-2 text-zinc-500">{row.messages.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
