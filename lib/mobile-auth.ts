// lib/mobile-auth.ts
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
const ALG = "HS256";
const EXPIRY = "7d";

export async function signMobileJwt(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export type MobileUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

export async function getMobileUser(request: Request): Promise<MobileUser> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
  const token = authHeader.slice(7);

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secret);
    userId = payload.sub!;
  } catch {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, active: true },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  return user;
}

export async function requireMobileRole(
  request: Request,
  allowed: Role[],
): Promise<MobileUser> {
  const user = await getMobileUser(request);
  if (!allowed.includes(user.role)) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
  return user;
}

export function withMobileAuth(
  handler: (req: Request, user: MobileUser, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getMobileUser(req);
      return await handler(req, user, ctx);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 401) {
        return Response.json({ error: "غير مصرح" }, { status: 401 });
      }
      if (e.status === 403) {
        return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
      }
      console.error("[mobile-api]", e.message);
      return Response.json({ error: "خطأ في الخادم" }, { status: 500 });
    }
  };
}
