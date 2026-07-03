import { STATUS_BADGE_STYLES, STATUS_LABELS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_BADGE_STYLES[status] ?? "bg-zinc-100 text-zinc-600"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
