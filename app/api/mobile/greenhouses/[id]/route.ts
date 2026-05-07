import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { Role, AuditAction } from "@prisma/client";

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

  if (parsed.data.name) {
    const gh = await prisma.greenhouse.findUnique({ where: { id }, select: { name: true } });
    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Greenhouse",
      entityId: () => id,
      before: { name: gh?.name },
      mutate: (tx) => tx.greenhouse.update({ where: { id }, data: { name: parsed.data.name! } }),
    });
  }
  if (parsed.data.cycleDuration) {
    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "GreenhouseSettings",
      entityId: () => id,
      mutate: (tx) => tx.greenhouseSettings.upsert({ where: { greenhouseId: id }, create: { greenhouseId: id, cycleDuration: parsed.data.cycleDuration! }, update: { cycleDuration: parsed.data.cycleDuration! } }),
    });
  }
  return Response.json({ ok: true });
});
