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

export async function deleteUser(session: Session, userId: string) {
  if (userId === session.user.id) {
    throw new Error("Kendi hesabınızı silemezsiniz");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    const [requestCount, quoteCount, approvalCount, deliveryCount, acceptanceCount] =
      await Promise.all([
        tx.purchaseRequest.count({ where: { requesterId: userId } }),
        tx.quote.count({ where: { enteredByUserId: userId } }),
        tx.approval.count({ where: { approverId: userId } }),
        tx.delivery.count({ where: { shippedByUserId: userId } }),
        tx.deliveryAcceptance.count({ where: { acceptedByUserId: userId } }),
      ]);

    if (requestCount + quoteCount + approvalCount + deliveryCount + acceptanceCount > 0) {
      throw new Error(
        "Bu kullanıcının geçmiş işlem kayıtları var, izlenebilirlik için silinemez — bunun yerine pasife alın"
      );
    }

    await logAudit(tx, {
      userId: session.user.id,
      action: "user_deleted",
      entityType: "User",
      entityId: userId,
      details: { email: user.email },
    });

    // UserRole kayıtları şemadaki onDelete: Cascade ilişkisi sayesinde birlikte silinir.
    await tx.user.delete({ where: { id: userId } });
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
