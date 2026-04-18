import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnApp = !nextUrl.pathname.startsWith("/login");
      if (isOnApp) return isLoggedIn;
      if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? session.user.id;
        session.user.role = token.role as "ADMIN" | "OPERATOR" | "ACCOUNTANT";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
