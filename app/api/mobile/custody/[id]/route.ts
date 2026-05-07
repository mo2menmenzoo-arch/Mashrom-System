import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCustodyBalance } from "@/lib/custody";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({ recordType: z.enum(["deposit", "withdrawal"]), date: z.coerce.date(), amount: z.coerce.number().positive(), notes: z.string().trim().max(200).optional(), description: z.string().trim().min(1).max(200).optional() });

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.custodyWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  if (parsed.data.recordType === "deposit") {
    const deposit = await prisma.custodyDeposit.findUnique({ where: { id } });
    if (!deposit) return Response.json({ error: "الإيداع غير موجود" }, { status: 404 });
    await assertCycleOpen(deposit.cycleId, { userRole: user.role as Role });
    await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "CustodyDeposit", entityId: () => id, before: { amount: deposit.amount }, mutate: (tx) => tx.custodyDeposit.update({ where: { id }, data: { date: parsed.data.date, amount: parsed.data.amount, notes: parsed.data.notes ?? null } }) });
  } else {
    const withdrawal = await prisma.custodyWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) return Response.json({ error: "الصرفية غير موجودة" }, { status: 404 });
    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role as Role });
    const balanceWithout = (await getCustodyBalance()) + Number(withdrawal.amount);
    if (parsed.data.amount > balanceWithout) return Response.json({ error: `المبلغ يتجاوز رصيد العهدة. الحد الأقصى: ${balanceWithout.toFixed(2)} ج.م` }, { status: 400 });
    await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "CustodyWithdrawal", entityId: () => id, before: { amount: withdrawal.amount }, mutate: (tx) => tx.custodyWithdrawal.update({ where: { id }, data: { date: parsed.data.date, amount: parsed.data.amount, description: parsed.data.description ?? withdrawal.description } }) });
  }
  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (req, user, ctx) => {
  if (!perms.custodyWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const { recordType } = await req.json().catch(() => ({ recordType: "deposit" }));
  if (recordType === "deposit") {
    const deposit = await prisma.custodyDeposit.findUnique({ where: { id } });
    if (!deposit) return Response.json({ error: "الإيداع غير موجود" }, { status: 404 });
    await assertCycleOpen(deposit.cycleId, { userRole: user.role as Role });
    await withAudit({ userId: user.id, action: AuditAction.DELETE, entity: "CustodyDeposit", entityId: () => id, before: { amount: deposit.amount }, mutate: (tx) => tx.custodyDeposit.delete({ where: { id } }) });
  } else {
    const withdrawal = await prisma.custodyWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) return Response.json({ error: "الصرفية غير موجودة" }, { status: 404 });
    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role as Role });
    await withAudit({ userId: user.id, action: AuditAction.DELETE, entity: "CustodyWithdrawal", entityId: () => id, before: { amount: withdrawal.amount }, mutate: async (tx) => { if (withdrawal.expenseId) await tx.expense.delete({ where: { id: withdrawal.expenseId } }); if (withdrawal.foundingExpenseId) await tx.foundingExpense.delete({ where: { id: withdrawal.foundingExpenseId } }); return tx.custodyWithdrawal.delete({ where: { id } }); } });
  }
  return Response.json({ ok: true });
});
