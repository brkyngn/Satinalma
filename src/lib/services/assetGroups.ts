import { prisma } from "@/lib/prisma";
import type { AssetGroupInput } from "@/lib/validations/assetGroup";

export function listAssetGroups() {
  return prisma.assetGroup.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export function listActiveAssetGroups() {
  return prisma.assetGroup.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export function getAssetGroup(id: string) {
  return prisma.assetGroup.findUnique({ where: { id } });
}

export async function createAssetGroup(input: AssetGroupInput) {
  const existing = await prisma.assetGroup.findUnique({ where: { name: input.name } });
  if (existing) throw new Error("Bu isimde bir grup zaten var");
  return prisma.assetGroup.create({
    data: { name: input.name, active: input.active },
  });
}

export async function updateAssetGroup(id: string, input: AssetGroupInput) {
  const existing = await prisma.assetGroup.findUnique({ where: { name: input.name } });
  if (existing && existing.id !== id) throw new Error("Bu isimde bir grup zaten var");
  return prisma.assetGroup.update({
    where: { id },
    data: { name: input.name, active: input.active },
  });
}
