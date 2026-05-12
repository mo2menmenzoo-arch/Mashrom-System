import { prisma } from "@/lib/db";
import { signMobileJwt } from "@/lib/mobile-auth";
import { getUserEffectivePerms } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  accessToken: z.string().min(1).optional(),
  idToken: z.string().min(1).optional(),
}).refine(d => d.accessToken || d.idToken, { message: "accessToken or idToken required" });

export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    let email: string | null = null;
    let emailVerified = false;

    if (parsed.data.accessToken) {
      // Verify via Google userinfo endpoint (access token flow)
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${parsed.data.accessToken}` },
      });
      if (!res.ok) {
        return Response.json({ error: "رمز جوجل غير صحيح" }, { status: 401 });
      }
      const info = await res.json();
      email = info.email;
      emailVerified = info.verified_email === true;
    } else if (parsed.data.idToken) {
      // Verify via Google tokeninfo endpoint (id token flow)
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${parsed.data.idToken}`);
      if (!res.ok) {
        return Response.json({ error: "رمز جوجل غير صحيح" }, { status: 401 });
      }
      const payload = await res.json();
      email = payload.email;
      emailVerified = payload.email_verified === "true" || payload.email_verified === true;
    }

    if (!email || !emailVerified) {
      return Response.json({ error: "الإيميل غير مفعّل أو غير موجود" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email, active: true },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return Response.json(
        { error: "هذا الحساب غير مسجّل في النظام.\nتواصل مع المدير لإضافتك." },
        { status: 403 }
      );
    }

    const token = await signMobileJwt(user.id);
    const perms = await getUserEffectivePerms(user.id);

    return Response.json({ token, user: { ...user, perms } });
  } catch (err) {
    console.error("[mobile-auth/google]", err);
    return Response.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
