import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({ date: z.coerce.date(), customerName: z.string().trim().min(1).max(100), cartons: z.coerce.number().int().positive(), pricePerCarton: z.coerce.number().positive(), paid: z.coerce.number().min(0) });

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.salesWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return Response.json({ error: "البيع غير موجود" }, { status: 404 });
  await assertCycleOpen(sale.cycleId, { userRole: user.role as Role });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { date, customerName, cartons, pricePerCarton, paid } = parsed.data;
  const total = Number((cartons * pricePerCarton).toFixed(2));
  if (paid > total) return Response.json({ error: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" }, { status: 400 });
  await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "Sale", entityId: () => id, before: { cartons: sale.cartons, pricePerCarton: sale.pricePerCarton, paid: sale.paid }, mutate: async (tx) => { if (sale.inventoryItemId && cartons !== sale.cartons) await tx.inventoryTxn.updateMany({ where: { saleId: id }, data: { qty: -cartons } }); return tx.sale.update({ where: { id }, data: { date, customerName, cartons, pricePerCarton, total, paid } }); } });
  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.salesWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return Response.json({ error: "البيع غير موجود" }, { status: 404 });
  await assertCycleOpen(sale.cycleId, { userRole: user.role as Role });
  await withAudit({ userId: user.id, action: AuditAction.DELETE, entity: "Sale", entityId: () => id, before: { customerName: sale.customerName, total: sale.total }, mutate: async (tx) => { await tx.inventoryTxn.deleteMany({ where: { saleId: id } }); return tx.sale.delete({ where: { id } }); } });
  return Response.json({ ok: true });
});
