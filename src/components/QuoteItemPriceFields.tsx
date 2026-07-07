"use client";

import { useState } from "react";

type Item = {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
};

const numberFormat = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function QuoteItemPriceFields({ items }: { items: Item[] }) {
  // itemId -> girilen birim fiyat (ham string)
  const [prices, setPrices] = useState<Record<string, string>>({});

  const lineTotal = (item: Item) => {
    const unitPrice = Number(prices[item.id]);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) return 0;
    return unitPrice * quantity;
  };

  const grandTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Ürün / Malzeme</th>
            <th className="px-3 py-2 font-medium">Miktar</th>
            <th className="px-3 py-2 font-medium">Birim Fiyat</th>
            <th className="px-3 py-2 text-right font-medium">Satır Tutarı</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-2 text-zinc-800">{item.productName}</td>
              <td className="px-3 py-2 text-zinc-600">
                {item.quantity} {item.unit}
              </td>
              <td className="px-3 py-2">
                <input
                  name={`itemPrice_${item.id}`}
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="0"
                  value={prices[item.id] ?? ""}
                  onChange={(event) =>
                    setPrices((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                  className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </td>
              <td className="px-3 py-2 text-right text-zinc-700">
                {numberFormat.format(lineTotal(item))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-zinc-200 bg-zinc-50">
          <tr>
            <td colSpan={3} className="px-3 py-2 text-right text-xs font-medium text-zinc-500">
              Kalemler toplamı
            </td>
            <td className="px-3 py-2 text-right text-sm font-semibold text-zinc-900">
              {numberFormat.format(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
