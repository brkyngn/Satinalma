import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CreateProjectInput } from "@/lib/validations/admin";
import type { Session } from "next-auth";

export async function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: "desc" } });
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
