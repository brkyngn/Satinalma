import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import type { RoleName } from "../../generated/prisma/enums";

export function hasRole(roles: RoleName[], allowed: RoleName[]) {
  return roles.includes("admin") || allowed.some((role) => roles.includes(role));
}

/** Server Component / sayfalarda kullanılır: oturum yoksa /giris'e yönlendirir. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return session;
}

/**
 * Server Component / sayfalarda kullanılır: oturum yoksa /giris'e yönlendirir,
 * gerekli role sahip değilse 404 gösterir (kaynağın varlığını ifşa etmemek için).
 */
export async function requirePageRole(allowed: RoleName[]): Promise<Session> {
  const session = await requireSession();
  if (!hasRole(session.user.roles, allowed)) notFound();
  return session;
}

type ApiSessionResult =
  | { ok: true; session: Session }
  | { ok: false; response: Response };

/** Route Handler / Server Action'larda kullanılır: sadece oturum kontrolü yapar, herhangi bir role izin verir. */
export async function requireApiSession(): Promise<ApiSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, session };
}

/** Route Handler / Server Action'larda kullanılır: uygun HTTP durum koduyla erken dönüş sağlar. */
export async function requireApiRole(allowed: RoleName[]): Promise<ApiSessionResult> {
  const result = await requireApiSession();
  if (!result.ok) return result;

  if (!hasRole(result.session.user.roles, allowed)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      ),
    };
  }

  return result;
}
