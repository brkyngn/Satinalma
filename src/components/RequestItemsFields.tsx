"use client";

import { useState } from "react";

type Row = { key: number };

let nextKey = 1;

export function RequestItemsFields() {
  const [rows, setRows] = useState<Row[]>([{ key: nextKey++ }]);

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.key} className="grid grid-cols-12 gap-2 rounded-md border border-zinc-200 p-3">
          <div className="col-span-4">
            <label className="mb-1 block text-xs font-medium text-zinc-500">Ürün / Malzeme</label>
            <input
              name="productName"
              required
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">Miktar</label>
            <input
              name="quantity"
              type="number"
              step="any"
              min="0"
              required
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">Birim</label>
            <input
              name="unit"
              required
              placeholder="adet, m3, ton..."
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-3">
            <label className="mb-1 block text-xs font-medium text-zinc-500">Açıklama</label>
            <input
              name="specNote"
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-1 flex items-end justify-end">
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Sil
              </button>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows([...rows, { key: nextKey++ }])}
        className="rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-400"
      >
        + Kalem Ekle
      </button>
    </div>
  );
}
