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
  // getToken() varsayılan olarak secureCookie=false kabul eder ve bu durumda
  // güvensiz (prefix'siz) çerez adına bakar. Render gibi HTTPS'i reverse proxy'de
  // sonlandıran platformlarda auth()/signIn() (trustHost sayesinde) isteğin HTTPS
  // olduğunu anlayıp `__Secure-` önekli çerez adını kullanıyor — secureCookie
  // açıkça verilmezse getToken() bu çerezi hiç bulamıyor ve kullanıcı her zaman
  // oturumsuz görünüyordu (başarılı girişten hemen sonra tekrar /giris'e düşme).
  const secureCookie =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });
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
