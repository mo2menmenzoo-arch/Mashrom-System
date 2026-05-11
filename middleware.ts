import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default async function middleware(request: NextRequest) {
  // Mobile API routes use their own JWT auth — bypass NextAuth completely
  if (request.nextUrl.pathname.startsWith("/api/mobile")) {
    return NextResponse.next();
  }
  return (auth as any)(request);
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|sw.js|manifest.webmanifest|icons|favicon.ico).*)",
  ],
};
