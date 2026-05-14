import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendJoinRequestEmail } from "@/lib/mailer";
import type { Role } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
  role: z.enum(["OPERATOR", "ACCOUNTANT", "VIEWER"]).default("OPERATOR"),
});

export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "أكمل جميع البيانات بشكل صحيح" }, { status: 400 });
    }

    const { name, email, phone, password, role } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.active) {
        return Response.json({ error: "هذا الإيميل مسجّل بالفعل" }, { status: 409 });
      } else {
        // Resend notification for existing pending user
        await sendJoinRequestEmail({ requesterName: existing.name ?? name, requesterEmail: email, requesterPhone: phone, role });
        return Response.json({ message: "تم إرسال طلبك مجدداً. انتظر موافقة المدير." });
      }
    }

    // Create inactive user (pending approval)
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role as Role,
        active: false,
      },
    });

    // Send email to admins
    await sendJoinRequestEmail({ requesterName: name, requesterEmail: email, requesterPhone: phone, role });

    return Response.json({ message: "تم إرسال طلبك بنجاح! سيتواصل معك المدير قريباً." });
  } catch (err) {
    console.error("[request-access]", err);
    return Response.json({ error: "خطأ في الخادم، حاول مرة أخرى" }, { status: 500 });
  }
}
