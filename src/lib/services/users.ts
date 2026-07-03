import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/admin";
import type { Session } from "next-auth";

export async function listUsers() {
  return prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
}

export async function createUser(session: Session, input: CreateUserInput) {
  return prisma.$transaction(async (tx) => {
    const roles = await tx.role.findMany({ where: { name: { in: input.roles } } });
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone,
        active: true,
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
      },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "user_created",
      entityType: "User",
      entityId: user.id,
      details: { email: user.email, roles: input.roles },
    });

    return user;
  });
}

export async function updateUser(
  session: Session,
  userId: string,
  input: UpdateUserInput
) {
  return prisma.$transaction(async (tx) => {
    const roles = await tx.role.findMany({ where: { name: { in: input.roles } } });

    await tx.userRole.deleteMany({ where: { userId } });

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        phone: input.phone,
        active: input.active,
        ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 10) } : {}),
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
      },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "user_updated",
      entityType: "User",
      entityId: user.id,
      details: { active: input.active, roles: input.roles },
    });

    return user;
  });
}
