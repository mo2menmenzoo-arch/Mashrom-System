import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, CycleStatus, Role } from "@prisma/client";
import { getCyclePnL } from "@/lib/reports";
import { cycleDayNumber, cycleProgress } from "@/lib/cycle";

export const GET = withMobileAuth(async (_req, _user, ctx) => {
  const { id } = await ctx!.params;
  const cycle = await prisma.cycle.findUnique({ where: { id }, include: { greenhouse: { select: { name: true, number: true } } } });
  if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });
  const pnl = await getCyclePnL(id);
  const dayNumber = cycleDayNumber(cycle.startDate);
  const progressPct = cycleProgress(cycle.startDate);
  return Response.json({ ...cycle, pnl, dayNumber, progressPct });
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.cycleManage.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;
  const { action } = await req.json();
  if (action === "close") {
    const cycle = await prisma.cycle.findUnique({ where: { id } });
    if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });
    if (cycle.status === CycleStatus.ENDED) return Response.json({ error: "الدورة مغلقة بالفعل" }, { status: 409 });
    await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "Cycle", entityId: () => id, before: { status: cycle.status }, mutate: (tx) => tx.cycle.update({ where: { id }, data: { status: CycleStatus.ENDED, closedAt: new Date(), closedById: user.id } }) });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "إجراء غير معروف" }, { status: 400 });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.cycleManage.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;
  const cycle = await prisma.cycle.findUnique({ where: { id }, include: { _count: { select: { sales: true, expenses: true, readings: true, deposits: true, withdrawals: true, inventory: true } } } });
  if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });
  const total = Object.values(cycle._count).reduce((s, n) => s + n, 0);
  if (total > 0) return Response.json({ error: "لا يمكن حذف دورة تحتوي على بيانات" }, { status: 409 });
  await withAudit({
    userId: user.id,
    action: AuditAction.DELETE,
    entity: "Cycle",
    entityId: () => id,
    before: { number: cycle.number, status: cycle.status },
    mutate: (tx) => tx.cycle.delete({ where: { id } }),
  });
  return Response.json({ ok: true });
});
