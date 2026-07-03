import { requireSession } from "@/lib/rbac";

export default async function PanelPage() {
  const session = await requireSession();

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900">
        Hoş geldiniz, {session.user.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Role göre durum bazlı özet sayılar talep/teklif/onay modülü ile birlikte
        burada gösterilecek.
      </p>
    </div>
  );
}
