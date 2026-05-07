import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCustodyBalance } from "@/lib/custody";
import { AuditAction, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const [deposits, withdrawals, balance] = await Promise.all([
    prisma.custodyDeposit.findMany({ where: cycleId ? { cycleId } : undefined, orderBy: { date: "desc" } }),
    prisma.custodyWithdrawal.findMany({ where: cycleId ? { cycleId } : undefined, orderBy: { date: "desc" } }),
    getCustodyBalance(),
  ]);
  return Response.json({ deposits, withdrawals, balance });
});

const depositSchema = z.object({ type: z.literal("deposit"), cycleId: z.string().min(1), date: z.coerce.date(), amount: z.coerce.number().positive(), notes: z.string().trim().max(200).optional() });
const withdrawalSchema = z.object({ type: z.literal("withdrawal"), cycleId: z.string().min(1), date: z.coerce.date(), description: z.string().trim().min(1).max(200), amount: z.coerce.number().positive(), category: z.enum(["OPERATING", "FOUNDING"]).default("OPERATING"), greenhouseId: z.string().min(1) });
const bodySchema = z.discriminatedUnion("type", [depositSchema, withdrawalSchema]);

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.custodyWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  await assertCycleOpen(parsed.data.cycleId, { userRole: user.role as Role });
  if (parsed.data.type === "deposit") {
    const { cycleId, date, amount, notes } = parsed.data;
    const record = await withAudit({ userId: user.id, action: AuditAction.CREATE, entity: "CustodyDeposit", entityId: (r: { id: string }) => r.id, mutate: (tx) => tx.custodyDeposit.create({ data: { cycleId, date, amount, notes: notes ?? null } }) });
    return Response.json(record, { status: 201 });
  }
  const { cycleId, date, description, amount, category, greenhouseId } = parsed.data;
  const balance = await getCustodyBalance();
  if (amount > balance) return Response.json({ error: `رصيد العهدة غير كافٍ. الرصيد الحالي: ${balance.toFixed(2)} ج.م` }, { status: 400 });
  const record = await withAudit({ userId: user.id, action: AuditAction.CREATE, entity: "CustodyWithdrawal", entityId: (r: { id: string }) => r.id, mutate: async (tx) => {
    if (category === "OPERATING") { const expense = await tx.expense.create({ data: { cycleId, date, description, amount, createdById: user.id } }); return tx.custodyWithdrawal.create({ data: { cycleId, date, description, amount, category, expenseId: expense.id } }); }
    const fe = await tx.foundingExpense.create({ data: { greenhouseId, date, description, amount } });
    return tx.custodyWithdrawal.create({ data: { cycleId, date, description, amount, category, foundingExpenseId: fe.id } });
  }});
  return Response.json(record, { status: 201 });
});
