import { requirePageRole, hasRole } from "@/lib/rbac";
import { INVENTORY_VIEW_ROLES, INVENTORY_MANAGE_ROLES } from "@/lib/constants";
import { InventoryNav } from "@/components/InventoryNav";

export default async function DemirbasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Modülün tamamı en az izleyici rolü (veya admin) gerektirir.
  const session = await requirePageRole(INVENTORY_VIEW_ROLES);
  const isManager = hasRole(session.user.roles, INVENTORY_MANAGE_ROLES);

  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold text-zinc-900">Demirbaş ve Zimmet</h1>
      <InventoryNav isManager={isManager} />
      {children}
    </div>
  );
}
