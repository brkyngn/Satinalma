import Image from "next/image";
import Link from "next/link";
import { requireSession, hasRole } from "@/lib/rbac";
import { INVENTORY_VIEW_ROLES } from "@/lib/constants";
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
  const canSeeInventory = hasRole(roles, INVENTORY_VIEW_ROLES);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b-4 border-brand-red bg-brand-navy px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/panel" className="flex items-center gap-3">
              <Image
                src="/alucon-logo-white.png"
                alt="Alucon Group"
                width={952}
                height={491}
                priority
                className="h-8 w-auto"
              />
              <span className="hidden border-l border-white/20 pl-3 text-sm font-medium text-white/80 sm:inline">
                Satın Alma Yönetimi
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-white/70">
              <Link href="/panel" className="transition-colors hover:text-white active:text-brand-red">
                Panel
              </Link>
              <Link href="/talepler" className="transition-colors hover:text-white active:text-brand-red">
                Talepler
              </Link>
              {canSeeInventory && (
                <Link href="/demirbas" className="transition-colors hover:text-white active:text-brand-red">
                  Demirbaş
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link
                    href="/admin/kullanicilar"
                    className="transition-colors hover:text-white active:text-brand-red"
                  >
                    Kullanıcılar
                  </Link>
                  <Link
                    href="/admin/projeler"
                    className="transition-colors hover:text-white active:text-brand-red"
                  >
                    Projeler
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/70">
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
                className="text-white/70 transition-colors hover:text-brand-red"
              >
                Çıkış Yap
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-zinc-50 px-6 py-6">{children}</main>
    </div>
  );
}
