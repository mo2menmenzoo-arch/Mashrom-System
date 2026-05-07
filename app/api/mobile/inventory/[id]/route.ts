import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), unit: z.string().trim().min(1).max(20).optional(), expiryDate: z.coerce.date().nullable().optional(), lowStockAt: z.coerce.number().positive().nullable().optional() });

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.inventoryWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "الصنف غير موجود" }, { status: 404 });
  await assertCycleOpen(item.cycleId, { userRole: user.role as Role });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "InventoryItem", entityId: () => id, before: { name: item.name }, mutate: (tx) => tx.inventoryItem.update({ where: { id }, data: parsed.data }) });
  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.inventoryWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "الصنف غير موجود" }, { status: 404 });
  await assertCycleOpen(item.cycleId, { userRole: user.role as Role });
  await withAudit({ userId: user.id, action: AuditAction.DELETE, entity: "InventoryItem", entityId: () => id, before: { name: item.name }, mutate: async (tx) => { await tx.inventoryTxn.deleteMany({ where: { itemId: id } }); return tx.inventoryItem.delete({ where: { id } }); } });
  return Response.json({ ok: true });
});
