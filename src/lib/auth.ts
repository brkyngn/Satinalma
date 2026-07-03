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

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
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
      const currentUser = await prisma.user.findUnique({
        where: { id: token.id },
        include: { roles: { include: { role: true } } },
      });

      session.user.id = token.id;
      session.user.roles = currentUser?.active
        ? currentUser.roles.map((userRole) => userRole.role.name)
        : [];

      return session;
    },
  },
});
