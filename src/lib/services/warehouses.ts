import { prisma } from "@/lib/prisma";
import type { WarehouseInput } from "@/lib/validations/warehouse";

export function listWarehouses() {
  return prisma.warehouse.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export function listActiveWarehouses() {
  return prisma.warehouse.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export function getWarehouse(id: string) {
  return prisma.warehouse.findUnique({ where: { id } });
}

export function createWarehouse(input: WarehouseInput) {
  return prisma.warehouse.create({
    data: {
      name: input.name,
      type: input.type,
      address: input.address,
      active: input.active,
    },
  });
}

export function updateWarehouse(id: string, input: WarehouseInput) {
  return prisma.warehouse.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      address: input.address,
      active: input.active,
    },
  });
}
