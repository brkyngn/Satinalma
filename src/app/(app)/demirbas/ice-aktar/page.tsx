import { requirePageRole } from "@/lib/rbac";
import { INVENTORY_MANAGE_ROLES } from "@/lib/constants";
import { AssetImport } from "@/components/AssetImport";

export default async function IceAktarPage() {
  await requirePageRole(INVENTORY_MANAGE_ROLES);

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-zinc-900">Excel ile İçe Aktarma</h2>
      <AssetImport />
    </div>
  );
}
