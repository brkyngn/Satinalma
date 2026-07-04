import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateRequestInput } from "@/lib/validations/request";
import type { Session } from "next-auth";
import type { Prisma } from "../../../generated/prisma/client";

async function generateRequestNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;
  const count = await tx.purchaseRequest.count({
    where: { requestNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export async function createPurchaseRequest(
  session: Session,
  input: CreateRequestInput
) {
  return prisma.$transaction(async (tx) => {
    const requestNumber = await generateRequestNumber(tx);

    const request = await tx.purchaseRequest.create({
      data: {
        requestNumber,
        requesterId: session.user.id,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        neededByDate: input.neededByDate,
        status: "submitted",
        items: {
          create: input.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            specNote: item.specNote,
          })),
        },
      },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "request_created",
      entityType: "PurchaseRequest",
      entityId: request.id,
      details: { requestNumber: request.requestNumber },
    });

    return request;
  });
}

export type RequestListFilters = {
  status?: string;
  projectId?: string;
  from?: string;
  to?: string;
  search?: string;
};

export async function listPurchaseRequests(
  session: Session,
  filters: RequestListFilters
) {
  const isRequesterOnly =
    session.user.roles.length === 1 && session.user.roles[0] === "requester";

  const where: Prisma.PurchaseRequestWhereInput = {
    ...(isRequesterOnly ? { requesterId: session.user.id } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { requestNumber: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  };

  return prisma.purchaseRequest.findMany({
    where,
    include: { project: true, requester: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseRequestDetail(session: Session, id: string) {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      project: true,
      requester: true,
      items: true,
      quotes: {
        include: { attachments: true, enteredBy: true },
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        include: { approver: true, selectedQuote: true },
        orderBy: { decidedAt: "desc" },
      },
      deliveries: {
        include: {
          shippedBy: true,
          quote: true,
          acceptance: { include: { attachments: true, acceptedBy: true } },
        },
        orderBy: { shippedDate: "desc" },
      },
    },
  });

  if (!request) return null;

  const isRequesterOnly =
    session.user.roles.length === 1 && session.user.roles[0] === "requester";
  if (isRequesterOnly && request.requesterId !== session.user.id) {
    return null;
  }

  return request;
}

export async function deletePurchaseRequest(session: Session, requestId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "request_deleted",
      entityType: "PurchaseRequest",
      entityId: requestId,
      details: { requestNumber: request.requestNumber, title: request.title, status: request.status },
    });

    // Kalemler, teklifler (ve ekleri), onaylar ve sevkiyatlar (ve kabul kayıtları)
    // şemadaki onDelete: Cascade ilişkileri sayesinde birlikte silinir.
    await tx.purchaseRequest.delete({ where: { id: requestId } });
  });
}

export type DashboardStats = {
  total: number;
  byStatus: Record<string, number>;
  awaitingQuotes: number;
  awaitingApproval: number;
  awaitingAcceptance: number;
};

export async function getDashboardStats(session: Session): Promise<DashboardStats> {
  const isRequesterOnly =
    session.user.roles.length === 1 && session.user.roles[0] === "requester";

  const where: Prisma.PurchaseRequestWhereInput = isRequesterOnly
    ? { requesterId: session.user.id }
    : {};

  // Tek sorguda tüm durumların sayısını almak için groupBy kullanılıyor;
  // her durum için ayrı count() çağırmak N ayrı round-trip'e yol açardı.
  const grouped = await prisma.purchaseRequest.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of grouped) {
    byStatus[row.status] = row._count;
    total += row._count;
  }

  return {
    total,
    byStatus,
    awaitingQuotes: (byStatus.submitted ?? 0) + (byStatus.quotes_collecting ?? 0),
    awaitingApproval: byStatus.pending_approval ?? 0,
    awaitingAcceptance: byStatus.delivered_pending_acceptance ?? 0,
  };
}

export async function submitRequestForApproval(
  session: Session,
  requestId: string
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    if (request.status !== "quotes_collecting" && request.status !== "submitted") {
      throw new Error("Talep bu aşamada onaya sunulamaz");
    }

    const updated = await tx.purchaseRequest.update({
      where: { id: requestId },
      data: { status: "pending_approval" },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "request_submitted_for_approval",
      entityType: "PurchaseRequest",
      entityId: requestId,
    });

    return updated;
  });
}
