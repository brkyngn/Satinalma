import Link from "next/link";
import { requireSession } from "@/lib/rbac";
import { signOut } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  requester: "Talep Eden",
  purchasing: "Satın Alma Sorumlusu",
  approver: "Onaylayıcı",
  site_manager: "Şantiye Sorumlusu",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const roles = session.user.roles;
  const isAdmin = roles.includes("admin");

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-zinc-900">
            Şantiye Satın Alma
          </span>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <Link href="/panel" className="transition-colors hover:text-zinc-900 active:text-zinc-950">
              Panel
            </Link>
            <Link href="/talepler" className="transition-colors hover:text-zinc-900 active:text-zinc-950">
              Talepler
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin/kullanicilar"
                  className="transition-colors hover:text-zinc-900 active:text-zinc-950"
                >
                  Kullanıcılar
                </Link>
                <Link
                  href="/admin/projeler"
                  className="transition-colors hover:text-zinc-900 active:text-zinc-950"
                >
                  Projeler
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          <span>
            {session.user.name} ·{" "}
            {roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/giris" });
            }}
          >
            <SubmitButton
              pendingText="Çıkış yapılıyor..."
              className="text-zinc-500 hover:text-zinc-900"
            >
              Çıkış Yap
            </SubmitButton>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-zinc-50 px-6 py-6">{children}</main>
    </div>
  );
}
