import { prisma } from "@/lib/db";
import { signMobileJwt } from "@/lib/mobile-auth";
import { getUserEffectivePerms } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    // Verify Google ID token via Google's tokeninfo endpoint
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${parsed.data.idToken}`);
    if (!res.ok) {
      return Response.json({ error: "رمز جوجل غير صحيح" }, { status: 401 });
    }
    const payload = await res.json();

    if (!payload.email_verified || payload.email_verified === "false") {
      return Response.json({ error: "الإيميل غير مفعّل" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email, active: true },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return Response.json({ error: "هذا الحساب غير مسجّل في النظام. تواصل مع المدير." }, { status: 403 });
    }

    const token = await signMobileJwt(user.id);
    const perms = await getUserEffectivePerms(user.id);

    return Response.json({ token, user: { ...user, perms } });
  } catch (err) {
    console.error("[mobile-auth/google]", err);
    return Response.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
