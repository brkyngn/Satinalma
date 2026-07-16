"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; managerOnly?: boolean };

const ITEMS: NavItem[] = [
  { href: "/demirbas", label: "Liste" },
  { href: "/demirbas/ozet", label: "Özet" },
  { href: "/demirbas/ice-aktar", label: "İçe Aktar", managerOnly: true },
  { href: "/demirbas/tanimlar/depolar", label: "Depolar", managerOnly: true },
  { href: "/demirbas/tanimlar/gruplar", label: "Gruplar", managerOnly: true },
  { href: "/demirbas/tanimlar/personel", label: "Personel", managerOnly: true },
];

export function InventoryNav({ isManager }: { isManager: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/demirbas" ? pathname === "/demirbas" : pathname.startsWith(href);

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-zinc-200">
      {ITEMS.filter((item) => !item.managerOnly || isManager).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            isActive(item.href)
              ? "border-brand-navy text-brand-navy"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
