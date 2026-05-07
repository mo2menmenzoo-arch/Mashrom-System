import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export const GET = withMobileAuth(async (_req, _user, ctx) => {
  const { id } = await ctx!.params;
  const gh = await prisma.greenhouse.findUnique({ where: { id }, include: { settings: true, foundingExpenses: true, cycles: { orderBy: { number: "desc" }, take: 5 } } });
  if (!gh) return Response.json({ error: "الصوبة غير موجودة" }, { status: 404 });
  return Response.json(gh);
});

const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), cycleDuration: z.coerce.number().int().min(1).optional() });

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  if (parsed.data.name) await prisma.greenhouse.update({ where: { id }, data: { name: parsed.data.name } });
  if (parsed.data.cycleDuration) await prisma.greenhouseSettings.upsert({ where: { greenhouseId: id }, create: { greenhouseId: id, cycleDuration: parsed.data.cycleDuration }, update: { cycleDuration: parsed.data.cycleDuration } });
  return Response.json({ ok: true });
});
