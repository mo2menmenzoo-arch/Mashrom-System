import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { computeCycleEnd } from "@/lib/cycle";
import { AuditAction, CycleStatus, Role } from "@prisma/client";

export const GET = withMobileAuth(async () => {
  const cycles = await prisma.cycle.findMany({
    orderBy: { startDate: "desc" },
    include: {
      greenhouse: { select: { name: true, number: true } },
      _count: { select: { sales: true, expenses: true, readings: true } },
    },
  });
  return Response.json(cycles);
});

const createSchema = z.object({
  startDate: z.coerce.date(),
  greenhouseId: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.cycleManage.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { startDate, greenhouseId, notes } = parsed.data;
  const existingActive = await prisma.cycle.findFirst({
    where: { status: CycleStatus.ACTIVE, greenhouseId },
    select: { number: true },
  });
  if (existingActive) {
    return Response.json({ error: `يوجد دورة نشطة بالفعل في هذه الصوبة (دورة ${existingActive.number}) — أغلقها أولاً` }, { status: 409 });
  }
  const last = await prisma.cycle.findFirst({ where: { greenhouseId }, orderBy: { number: "desc" }, select: { number: true } });
  const nextNumber = (last?.number ?? 0) + 1;
  const settings = await prisma.greenhouseSettings.findUnique({ where: { greenhouseId } });
  const cycleDuration = settings?.cycleDuration ?? 60;
  const cycle = await withAudit({
    userId: user.id,
    action: AuditAction.CREATE,
    entity: "Cycle",
    entityId: (c: { id: string }) => c.id,
    mutate: (tx) => tx.cycle.create({ data: { number: nextNumber, greenhouseId, startDate, endDate: computeCycleEnd(startDate, cycleDuration), status: CycleStatus.ACTIVE, notes: notes ?? null } }),
  });
  return Response.json(cycle, { status: 201 });
});
