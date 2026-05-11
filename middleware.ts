import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import type { NextAuthConfig } from "next-auth";

const mobileAllowedConfig: NextAuthConfig = {
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    authorized({ auth, request: { nextUrl } }) {
      // Mobile API routes have their own JWT — always pass through
      if (nextUrl.pathname.startsWith("/api/mobile")) return true;

      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/signup");
      if (isPublic) {
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
};

export default NextAuth(mobileAllowedConfig).auth;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|sw.js|manifest.webmanifest|icons|favicon.ico).*)",
  ],
};
