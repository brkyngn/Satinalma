import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { createUserSchema } from "@/lib/validations/admin";
import { createUser, listUsers } from "@/lib/services/users";

// GET: kullanıcı listesi — POST: yeni kullanıcı ekleme (admin).
export async function GET() {
  const result = await requireApiRole(["admin"]);
  if (!result.ok) return result.response;

  const users = await listUsers();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const result = await requireApiRole(["admin"]);
  if (!result.ok) return result.response;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const user = await createUser(result.session, parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı" }, { status: 409 });
  }
}
