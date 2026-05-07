import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const DEFAULT_ORG_ID = "default-org";

export const GET = withMobileAuth(async () => {
  const partners = await prisma.partner.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { position: "asc" } });
  return Response.json(partners);
});

const putSchema = z.array(z.object({ name: z.string().trim().min(1), sharePercent: z.number().min(0).max(100), position: z.number().int().min(0) }));

export const PUT = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const total = parsed.data.reduce((s, p) => s + p.sharePercent, 0);
  if (total > 100) return Response.json({ error: "إجمالي النسب يتجاوز 100%" }, { status: 400 });
  await prisma.$transaction([prisma.partner.deleteMany({ where: { organizationId: DEFAULT_ORG_ID } }), prisma.partner.createMany({ data: parsed.data.map((p) => ({ ...p, organizationId: DEFAULT_ORG_ID })) })]);
  return Response.json({ ok: true });
});
