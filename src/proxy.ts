import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Next.js 16'da "middleware" dosya kuralı "proxy" olarak yeniden adlandırıldı.
// Burada sadece oturum durumuna göre yönlendirme (UX) yapılır; gerçek rol bazlı
// yetkilendirme her sayfada/API route'da/server action'da ayrıca requirePageRole /
// requireApiRole ile kontrol edilir (bkz. lib/rbac.ts) — Next.js dokümantasyonu
// proxy'nin tek başına yetkilendirme için yeterli olmadığını belirtiyor.
//
// getToken() kasıtlı olarak auth() yerine kullanılıyor: auth() her çağrıda bizim
// session callback'imizi (bir veritabanı sorgusu) çalıştırır. Proxy her sayfa
// geçişinde tetiklendiği için bu, uzak veritabanına (Railway) gidiş-dönüş
// gecikmesini her tıklamaya ekliyordu. getToken() ise sadece JWT çözer,
// veritabanına gitmez — burada tek ihtiyacımız "oturum var mı" bilgisi.
export default async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const isLoggedIn = !!token;
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && pathname !== "/giris") {
    return NextResponse.redirect(new URL("/giris", request.url));
  }

  if (isLoggedIn && pathname === "/giris") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
