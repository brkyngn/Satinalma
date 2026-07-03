import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

export async function logAudit(
  db: Db,
  params: {
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
  }
) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details as Prisma.InputJsonValue | undefined,
    },
  });
}
