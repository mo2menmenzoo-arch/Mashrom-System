import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, InventoryTxnType, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const sales = await prisma.sale.findMany({ where: cycleId ? { cycleId } : undefined, orderBy: { date: "desc" } });
  return Response.json(sales);
});

const createSchema = z.object({ cycleId: z.string().min(1), date: z.coerce.date(), customerName: z.string().trim().min(1).max(100), cartons: z.coerce.number().int().positive(), pricePerCarton: z.coerce.number().positive(), paid: z.coerce.number().min(0).default(0), inventoryItemId: z.string().optional() });

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.salesWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { cycleId, date, customerName, cartons, pricePerCarton, paid, inventoryItemId } = parsed.data;
  const total = Number((cartons * pricePerCarton).toFixed(2));
  if (paid > total) return Response.json({ error: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" }, { status: 400 });
  await assertCycleOpen(cycleId, { userRole: user.role as Role });
  const sale = await withAudit({ userId: user.id, action: AuditAction.CREATE, entity: "Sale", entityId: (r: { id: string }) => r.id, mutate: async (tx) => {
    const s = await tx.sale.create({ data: { cycleId, date, customerName, cartons, pricePerCarton, total, paid, inventoryItemId: inventoryItemId ?? null } });
    if (inventoryItemId) await tx.inventoryTxn.create({ data: { itemId: inventoryItemId, type: InventoryTxnType.OUT, qty: -cartons, saleId: s.id } });
    return s;
  }});
  return Response.json(sale, { status: 201 });
});
