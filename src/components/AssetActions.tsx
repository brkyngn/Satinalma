"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { ASSET_STATUS_LABELS, ASSET_STATUS_OPTIONS } from "@/lib/constants";

type Option = { id: string; name: string };

type Props = {
  isAssigned: boolean;
  isAdmin: boolean;
  archived: boolean;
  warehouses: Option[];
  personnel: Option[];
  transferAction: (formData: FormData) => Promise<void>;
  assignAction: (formData: FormData) => Promise<void>;
  returnAction: (formData: FormData) => Promise<void>;
  statusAction: (formData: FormData) => Promise<void>;
  archiveAction: (formData: FormData) => Promise<void>;
};

type Panel = "transfer" | "zimmet" | "iade" | "durum" | null;

const inputClass = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm";
const primaryBtn =
  "rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark";

export function AssetActions(props: Props) {
  const [panel, setPanel] = useState<Panel>(null);

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const tabBtn = (p: Panel, label: string) => (
    <button
      type="button"
      onClick={() => toggle(p)}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        panel === p
          ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {tabBtn("transfer", "Transfer")}
        {!props.isAssigned && tabBtn("zimmet", "Zimmet Ver")}
        {props.isAssigned && tabBtn("zimmet", "Zimmet Değiştir")}
        {props.isAssigned && tabBtn("iade", "İade Al")}
        {tabBtn("durum", "Durum Değiştir")}
        {props.isAdmin && (
          <form action={props.archiveAction} className="ml-auto">
            <input type="hidden" name="archived" value={props.archived ? "false" : "true"} />
            <SubmitButton
              pendingText="..."
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                props.archived
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  : "border-red-300 text-brand-red hover:bg-red-50"
              }`}
            >
              {props.archived ? "Arşivden Çıkar" : "Arşivle"}
            </SubmitButton>
          </form>
        )}
      </div>

      {panel === "transfer" && (
        <form action={props.transferAction} className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Hedef Depo</label>
            <select name="toWarehouseId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Seçiniz</option>
              {props.warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <input name="note" placeholder="Not (opsiyonel)" className={inputClass} />
          <SubmitButton pendingText="Aktarılıyor..." className={primaryBtn}>Transfer Et</SubmitButton>
        </form>
      )}

      {panel === "zimmet" && (
        <form action={props.assignAction} className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Zimmetlenecek Personel</label>
            <select name="toAssigneeId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Seçiniz</option>
              {props.personnel.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <input name="note" placeholder="Not (opsiyonel)" className={inputClass} />
          <SubmitButton pendingText="Kaydediliyor..." className={primaryBtn}>
            {props.isAssigned ? "Zimmeti Devret" : "Zimmet Ver"}
          </SubmitButton>
        </form>
      )}

      {panel === "iade" && (
        <form action={props.returnAction} className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Teslim Alınacak Depo <span className="text-zinc-400">(opsiyonel)</span>
            </label>
            <select name="toWarehouseId" defaultValue="" className={inputClass}>
              <option value="">Konum değişmesin</option>
              {props.warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <input name="note" placeholder="Not (opsiyonel)" className={inputClass} />
          <SubmitButton pendingText="Alınıyor..." className={primaryBtn}>İade Al</SubmitButton>
        </form>
      )}

      {panel === "durum" && (
        <form action={props.statusAction} className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Yeni Durum</label>
            <select name="newStatus" required defaultValue="" className={inputClass}>
              <option value="" disabled>Seçiniz</option>
              {ASSET_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{ASSET_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <input name="note" required placeholder="Açıklama (zorunlu)" className={inputClass} />
          <SubmitButton pendingText="Kaydediliyor..." className={primaryBtn}>Durumu Değiştir</SubmitButton>
        </form>
      )}
    </div>
  );
}
