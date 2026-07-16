import { prisma } from "@/lib/prisma";
import type { PersonnelInput } from "@/lib/validations/personnel";

export function listPersonnel() {
  return prisma.personnel.findMany({ orderBy: [{ active: "desc" }, { fullName: "asc" }] });
}

export function listActivePersonnel() {
  return prisma.personnel.findMany({
    where: { active: true },
    orderBy: { fullName: "asc" },
  });
}

export function getPersonnel(id: string) {
  return prisma.personnel.findUnique({ where: { id } });
}

export function createPersonnel(input: PersonnelInput) {
  return prisma.personnel.create({
    data: {
      fullName: input.fullName,
      title: input.title,
      department: input.department,
      phone: input.phone,
      active: input.active,
    },
  });
}

export function updatePersonnel(id: string, input: PersonnelInput) {
  return prisma.personnel.update({
    where: { id },
    data: {
      fullName: input.fullName,
      title: input.title,
      department: input.department,
      phone: input.phone,
      active: input.active,
    },
  });
}
