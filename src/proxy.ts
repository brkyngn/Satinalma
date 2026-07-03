import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16'da "middleware" dosya kuralı "proxy" olarak yeniden adlandırıldı.
// Burada sadece oturumu olmayan/olan kullanıcıların doğru sayfaya yönlendirilmesi (UX) yapılır;
// gerçek rol bazlı yetkilendirme her sayfada/API route'da/server action'da ayrıca
// requirePageRole / requireApiRole ile kontrol edilir (bkz. lib/rbac.ts) — Next.js
// dokümantasyonu proxy'nin tek başına yetkilendirme için yeterli olmadığını belirtiyor.
export default auth((request) => {
  const isLoggedIn = !!request.auth;
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && pathname !== "/giris") {
    return NextResponse.redirect(new URL("/giris", request.url));
  }

  if (isLoggedIn && pathname === "/giris") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
