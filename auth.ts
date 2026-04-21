import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers = [
  Credentials({
    credentials: {
      email: { label: "البريد الإلكتروني", type: "email" },
      password: { label: "كلمة المرور", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.active || !user.password) return null;

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return null;

      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { prompt: "select_account" } },
    }) as never,
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // For Google OAuth, set default role if new user
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (existing && !existing.active) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        const role = (user as { role?: string }).role;
        if (role) {
          token.role = role;
        } else {
          // PrismaAdapter strips custom fields — fetch role directly from DB
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id! },
            select: { role: true },
          });
          token.role = dbUser?.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? session.user.id;
        // For Google users, fetch role from DB since it's not in token on first sign-in
        if (!token.role) {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email! },
            select: { role: true },
          });
          session.user.role = dbUser?.role ?? "OPERATOR";
        } else {
          session.user.role = token.role as "ADMIN" | "OPERATOR" | "ACCOUNTANT";
        }
      }
      return session;
    },
  },
});
