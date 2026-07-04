import Link from "next/link";
import { requireSession } from "@/lib/rbac";
import { getDashboardStats } from "@/lib/services/requests";
import { STATUS_LABELS } from "@/lib/constants";

const STATUS_CARD_ORDER = [
  "pending_approval",
  "quotes_collecting",
  "submitted",
  "approved",
  "shipped",
  "delivered_pending_acceptance",
  "accepted",
  "partially_accepted",
  "rejected",
  "draft",
  "closed",
] as const;

export default async function PanelPage() {
  const session = await requireSession();
  const stats = await getDashboardStats(session);
  const roles = session.user.roles;

  const actionCards = [
    roles.includes("purchasing") && {
      label: "Teklif Toplanması Gereken",
      count: stats.awaitingQuotes,
      href: "/talepler?status=quotes_collecting",
    },
    roles.includes("approver") && {
      label: "Onayınızı Bekleyen",
      count: stats.awaitingApproval,
      href: "/talepler?status=pending_approval",
    },
    roles.includes("site_manager") && {
      label: "Kabulünüzü Bekleyen",
      count: stats.awaitingAcceptance,
      href: "/talepler?status=delivered_pending_acceptance",
    },
  ].filter((card): card is { label: string; count: number; href: string } => Boolean(card));

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900">
        Hoş geldiniz, {session.user.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Toplam {stats.total} satın alma talebi.
      </p>

      {actionCards.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {actionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 transition-all hover:border-amber-300 active:scale-[0.98]"
            >
              <p className="text-2xl font-semibold text-amber-800">{card.count}</p>
              <p className="mt-1 text-sm text-amber-700">{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STATUS_CARD_ORDER.map((status) => (
          <Link
            key={status}
            href={`/talepler?status=${status}`}
            className="rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 active:scale-[0.98]"
          >
            <p className="text-2xl font-semibold text-zinc-900">
              {stats.byStatus[status] ?? 0}
            </p>
            <p className="mt-1 text-sm text-zinc-500">{STATUS_LABELS[status]}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
