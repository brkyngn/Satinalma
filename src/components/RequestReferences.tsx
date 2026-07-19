"use client";

import { useEffect, useRef, useState } from "react";

type Ref = {
  id: number;
  kind: "link" | "file";
  url?: string;
  label?: string;
  file?: File;
};

let nextId = 1;

const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];
const MAX = 10 * 1024 * 1024;

export function RequestReferences() {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const fileRefs = refs.filter((r) => r.kind === "file");
  const linkRefs = refs.filter((r) => r.kind === "link");

  // Dosya referansları değiştikçe gizli çoklu dosya girişinin FileList'ini
  // DataTransfer ile yeniden kur (form gönderiminde bu inputla iletilir).
  useEffect(() => {
    if (!hiddenFileInput.current) return;
    const dt = new DataTransfer();
    for (const r of fileRefs) if (r.file) dt.items.add(r.file);
    hiddenFileInput.current.files = dt.files;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs]);

  function resetModal() {
    setUrl("");
    setLabel("");
    setFile(null);
    setErr(null);
  }

  function addRef() {
    setErr(null);
    if (mode === "link") {
      const raw = url.trim();
      if (!raw) return setErr("Bağlantı girin");
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        new URL(normalized);
      } catch {
        return setErr("Geçerli bir bağlantı girin");
      }
      setRefs((prev) => [
        ...prev,
        { id: nextId++, kind: "link", url: normalized, label: label.trim() || undefined },
      ]);
    } else {
      if (!file) return setErr("Dosya seçin");
      if (!ALLOWED.includes(file.type)) return setErr("Sadece JPG, PNG veya PDF");
      if (file.size > MAX) return setErr("Dosya boyutu 10MB'ı aşamaz");
      setRefs((prev) => [
        ...prev,
        { id: nextId++, kind: "file", file, label: label.trim() || undefined },
      ]);
    }
    resetModal();
    setOpen(false);
  }

  return (
    <div>
      {/* Form gönderiminde iletilen gizli alanlar */}
      <input ref={hiddenFileInput} type="file" name="refFiles" multiple className="hidden" tabIndex={-1} aria-hidden />
      {fileRefs.map((r) => (
        <input key={`fl-${r.id}`} type="hidden" name="refFileLabel" value={r.label ?? ""} />
      ))}
      {linkRefs.map((r) => (
        <input
          key={`lk-${r.id}`}
          type="hidden"
          name="refLink"
          value={JSON.stringify({ url: r.url, label: r.label })}
        />
      ))}

      {refs.length > 0 && (
        <ul className="mb-2 space-y-1">
          {refs.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-1.5 text-sm"
            >
              <span className="truncate text-zinc-700">
                {r.kind === "link" ? "🔗 " : "📎 "}
                {r.kind === "link"
                  ? r.label
                    ? `${r.label} — ${r.url}`
                    : r.url
                  : r.label
                    ? `${r.label} — ${r.file?.name}`
                    : r.file?.name}
              </span>
              <button
                type="button"
                onClick={() => setRefs((prev) => prev.filter((x) => x.id !== r.id))}
                className="ml-2 shrink-0 text-red-500 hover:text-red-700"
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          resetModal();
          setOpen(true);
        }}
        className="rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-zinc-400"
      >
        + Referans Ekle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Referans Ekle</h3>

            <div className="mb-4 flex gap-1 rounded-md bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("link");
                  setErr(null);
                }}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "link" ? "bg-white text-brand-navy shadow-sm" : "text-zinc-500"
                }`}
              >
                Bağlantı (Link)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("file");
                  setErr(null);
                }}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "file" ? "bg-white text-brand-navy shadow-sm" : "text-zinc-500"
                }`}
              >
                Resim / PDF
              </button>
            </div>

            {mode === "link" ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Bağlantı (URL)</label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Açıklama <span className="text-zinc-400">(opsiyonel)</span>
                  </label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Örn. Üretici ürün sayfası"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Dosya <span className="text-zinc-400">(JPG, PNG, PDF — en fazla 10MB)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Açıklama <span className="text-zinc-400">(opsiyonel)</span>
                  </label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Örn. Teknik çizim"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {err && <p className="mt-2 text-sm text-brand-red">{err}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={addRef}
                className="rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-navy-dark"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
