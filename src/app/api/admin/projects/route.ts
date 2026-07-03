import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { createProjectSchema } from "@/lib/validations/admin";
import { createProject, listProjects } from "@/lib/services/projects";

// GET: proje/şantiye listesi — POST: yeni proje tanımlama (admin).
export async function GET() {
  const result = await requireApiRole(["admin"]);
  if (!result.ok) return result.response;

  const projects = await listProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const result = await requireApiRole(["admin"]);
  if (!result.ok) return result.response;

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const project = await createProject(result.session, parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bu proje kodu zaten kullanılıyor" }, { status: 409 });
  }
}
