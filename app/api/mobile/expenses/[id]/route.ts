import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({ date: z.coerce.date(), description: z.string().trim().min(1).max(200), amount: z.coerce.number().positive() });

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.expenseWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return Response.json({ error: "المصروف غير موجود" }, { status: 404 });
  await assertCycleOpen(expense.cycleId, { userRole: user.role as Role });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "Expense", entityId: () => id, before: { description: expense.description, amount: expense.amount }, mutate: (tx) => tx.expense.update({ where: { id }, data: parsed.data }) });
  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (req, user, ctx) => {
  if (!perms.expenseWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const { reason } = await req.json().catch(() => ({ reason: undefined }));
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return Response.json({ error: "المصروف غير موجود" }, { status: 404 });
  await assertCycleOpen(expense.cycleId, { userRole: user.role as Role, allowOverride: true, reason });
  await withAudit({ userId: user.id, action: AuditAction.DELETE, entity: "Expense", entityId: () => id, before: { description: expense.description, amount: expense.amount }, reason, mutate: async (tx) => { if (expense.inventoryItemId) await tx.inventoryItem.delete({ where: { id: expense.inventoryItemId } }); return tx.expense.delete({ where: { id } }); } });
  return Response.json({ ok: true });
});
