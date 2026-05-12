import { NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Mobile API routes have their own JWT — always pass through
  if (pathname.startsWith("/api/mobile")) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie (HTTPS = __Secure prefix, HTTP = no prefix)
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token")?.value ??
    request.cookies.get("authjs.session-token")?.value;

  const isLoggedIn = Boolean(sessionToken);
  const isPublicPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  if (isPublicPage) {
    if (isLoggedIn)
      return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|sw.js|manifest.webmanifest|icons|favicon.ico).*)",
  ],
};
