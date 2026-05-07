import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signMobileJwt } from "@/lib/mobile-auth";
import { getUserEffectivePerms } from "@/lib/rbac";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active || !user.password) {
      return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    const token = await signMobileJwt(user.id);
    const perms = await getUserEffectivePerms(user.id);
    return Response.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, perms } });
  } catch (err) {
    console.error("[mobile/auth/login]", err);
    return Response.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
