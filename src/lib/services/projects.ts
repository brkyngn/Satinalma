import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateProjectInput } from "@/lib/validations/admin";
import type { Session } from "next-auth";

export async function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: "desc" } });
}

export async function deleteProject(session: Session, projectId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({ where: { id: projectId } });

    const requestCount = await tx.purchaseRequest.count({ where: { projectId } });
    if (requestCount > 0) {
      throw new Error("Bu projeye bağlı talepler var, silinemez — bunun yerine pasife alın");
    }

    await logAudit(tx, {
      userId: session.user.id,
      action: "project_deleted",
      entityType: "Project",
      entityId: projectId,
      details: { code: project.code, name: project.name },
    });

    await tx.project.delete({ where: { id: projectId } });
  });
}

export async function createProject(session: Session, input: CreateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        code: input.code,
        address: input.address,
        active: true,
      },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "project_created",
      entityType: "Project",
      entityId: project.id,
      details: { code: project.code },
    });

    return project;
  });
}
