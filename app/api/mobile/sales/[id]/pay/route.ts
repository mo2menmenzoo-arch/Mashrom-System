import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const schema = z.object({ additionalPaid: z.coerce.number().positive() });

export const POST = withMobileAuth(async (req, user, ctx) => {
  if (!perms.salesWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return Response.json({ error: "البيع غير موجود" }, { status: 404 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const newPaid = Number((Number(sale.paid) + parsed.data.additionalPaid).toFixed(2));
  if (newPaid > Number(sale.total)) return Response.json({ error: "المبلغ المدفوع يتجاوز إجمالي الفاتورة" }, { status: 400 });
  await assertCycleOpen(sale.cycleId, { userRole: user.role as Role });
  await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "Sale", entityId: () => id, before: { paid: sale.paid }, mutate: (tx) => tx.sale.update({ where: { id }, data: { paid: newPaid } }) });
  return Response.json({ ok: true, newPaid });
});
