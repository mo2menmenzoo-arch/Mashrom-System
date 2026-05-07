import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCycleBalances } from "@/lib/inventory";
import { AuditAction, InventorySource, InventoryTxnType, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const items = await prisma.inventoryItem.findMany({ where: cycleId ? { cycleId } : undefined, orderBy: { name: "asc" } });
  if (cycleId) {
    const balances = await getCycleBalances(cycleId);
    return Response.json(items.map((item) => ({ ...item, balance: Number(balances.get(item.id) ?? 0) })));
  }
  return Response.json(items);
});

const createSchema = z.object({ cycleId: z.string().min(1), name: z.string().trim().min(1).max(100), initialQty: z.coerce.number().positive(), unit: z.string().trim().min(1).max(20).default("وحدة"), expiryDate: z.coerce.date().optional(), lowStockAt: z.coerce.number().positive().optional() });

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.inventoryWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { cycleId, name, initialQty, unit, expiryDate, lowStockAt } = parsed.data;
  await assertCycleOpen(cycleId, { userRole: user.role as Role });
  const item = await withAudit({ userId: user.id, action: AuditAction.CREATE, entity: "InventoryItem", entityId: (r: { id: string }) => r.id, mutate: async (tx) => { const i = await tx.inventoryItem.create({ data: { cycleId, name, initialQty, unit, expiryDate: expiryDate ?? null, lowStockAt: lowStockAt ?? null, source: InventorySource.DIRECT_PURCHASE } }); await tx.inventoryTxn.create({ data: { itemId: i.id, type: InventoryTxnType.IN, qty: initialQty } }); return i; } });
  return Response.json(item, { status: 201 });
});
