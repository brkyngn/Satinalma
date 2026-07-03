import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { RoleName } from "../../generated/prisma/enums";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const {
  handlers: { GET, POST },
  auth: uncachedAuth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/giris" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.active) return null;

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!passwordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles.map((userRole) => userRole.role.name),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.roles = (user as unknown as { roles: RoleName[] }).roles;
      }
      return token;
    },
    async session({ session, token }) {
      // Rol/aktiflik durumu her session okumasında veritabanından tazelenir,
      // böylece admin bir kullanıcıyı pasife alır veya rolünü değiştirirse
      // etkisi mevcut oturumda da anında geçerli olur.
      //
      // `include` ile gelen ilişkiler bu Prisma sürümünde (driver adapter +
      // Query Compiler) JOIN değil, ayrı round-trip'lere dönüşüyor (users ->
      // user_roles -> roles, 3 ayrı istek). Uzak veritabanına her round-trip
      // yüzlerce ms sürdüğünden, burada ilişkiyi include yerine WHERE...IN
      // filtresiyle (tek sorguya derlenen EXISTS) sorguluyoruz ve iki sorguyu
      // paralel çalıştırıyoruz — 3 sıralı round-trip yerine 1 round-trip'lik
      // maliyet.
      const [currentUser, roles] = await Promise.all([
        prisma.user.findUnique({
          where: { id: token.id },
          select: { active: true },
        }),
        prisma.role.findMany({
          where: { users: { some: { userId: token.id } } },
          select: { name: true },
        }),
      ]);

      session.user.id = token.id;
      session.user.roles = currentUser?.active ? roles.map((role) => role.name) : [];

      return session;
    },
  },
});

// auth() birden fazla yerden (proxy, layout, sayfa) çağrılır; React cache()
// olmadan her çağrı session callback'ini (ve dolayısıyla bir veritabanı
// sorgusunu) tekrar tetikler. Tek bir istek içinde sonucu bir kez hesaplayıp
// paylaşmak, uzak veritabanına yapılan gereksiz round-trip'leri önler.
export const auth = cache(uncachedAuth);
export { GET, POST, signIn, signOut };
