import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const DEFAULT_ORG_ID = "default-org";

export const GET = withMobileAuth(async (_req, user) => {
  const [fin, partners, prefs] = await Promise.all([
    prisma.financialSettings.findUnique({ where: { organizationId: DEFAULT_ORG_ID } }),
    prisma.partner.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { position: "asc" } }),
    prisma.userPreferences.findUnique({ where: { userId: user.id } }),
  ]);
  return Response.json({ financial: { currency: fin?.currency ?? "EGP", taxRate: fin?.taxRate ?? 0 }, partners: partners.map((p) => ({ id: p.id, name: p.name, sharePercent: p.sharePercent, position: p.position })), theme: prefs?.theme ?? "light" });
});

const patchSchema = z.object({ theme: z.enum(["light", "dark"]).optional(), financial: z.object({ currency: z.enum(["EGP", "USD"]), taxRate: z.number().min(0).max(100) }).optional() });

export const PATCH = withMobileAuth(async (req, user) => {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  if (parsed.data.theme) {
    await prisma.userPreferences.upsert({ where: { userId: user.id }, create: { userId: user.id, theme: parsed.data.theme }, update: { theme: parsed.data.theme } });
  }
  if (parsed.data.financial) {
    if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
    await prisma.financialSettings.upsert({ where: { organizationId: DEFAULT_ORG_ID }, create: { organizationId: DEFAULT_ORG_ID, ...parsed.data.financial }, update: parsed.data.financial });
  }
  return Response.json({ ok: true });
});
