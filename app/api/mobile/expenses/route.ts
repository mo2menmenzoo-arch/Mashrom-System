import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, InventorySource, InventoryTxnType, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const expenses = await prisma.expense.findMany({ where: cycleId ? { cycleId } : undefined, orderBy: { date: "desc" }, include: { inventoryItem: { select: { id: true, name: true } } } });
  return Response.json(expenses);
});

const createSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
  isInventoryPurchase: z.boolean().optional(),
  inventoryName: z.string().trim().min(1).max(100).optional(),
  inventoryQty: z.coerce.number().positive().optional(),
  inventoryUnit: z.string().trim().min(1).max(20).optional(),
  inventoryExpiryDate: z.coerce.date().optional(),
  inventoryLowStockAt: z.coerce.number().positive().optional(),
});

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.expenseWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { cycleId, date, description, amount, isInventoryPurchase, inventoryName, inventoryQty, inventoryUnit, inventoryExpiryDate, inventoryLowStockAt } = parsed.data;
  await assertCycleOpen(cycleId, { userRole: user.role as Role });
  const expense = await withAudit({ userId: user.id, action: AuditAction.CREATE, entity: "Expense", entityId: (r: { id: string }) => r.id, mutate: async (tx) => {
    let inventoryItemId: string | undefined;
    if (isInventoryPurchase && inventoryName && inventoryQty) {
      const item = await tx.inventoryItem.create({ data: { cycleId, name: inventoryName, initialQty: inventoryQty, unit: inventoryUnit ?? "وحدة", expiryDate: inventoryExpiryDate ?? null, lowStockAt: inventoryLowStockAt ?? null, source: InventorySource.DIRECT_PURCHASE } });
      await tx.inventoryTxn.create({ data: { itemId: item.id, type: InventoryTxnType.IN, qty: inventoryQty } });
      inventoryItemId = item.id;
    }
    return tx.expense.create({ data: { cycleId, date, description, amount, createdById: user.id, inventoryItemId: inventoryItemId ?? null } });
  }});
  return Response.json(expense, { status: 201 });
});
