import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Skip static assets, api/auth, service worker, icons, and next internals
  matcher: [
    "/((?!api/auth|_next/static|_next/image|sw.js|manifest.webmanifest|icons|favicon.ico).*)",
  ],
};
