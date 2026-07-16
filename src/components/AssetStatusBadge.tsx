import { ASSET_STATUS_BADGE_STYLES, ASSET_STATUS_LABELS } from "@/lib/constants";

export function AssetStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ASSET_STATUS_BADGE_STYLES[status] ?? "bg-zinc-100 text-zinc-600"
      }`}
    >
      {ASSET_STATUS_LABELS[status] ?? status}
    </span>
  );
}
