"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction, InventoryTxnType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/cycle";

export type { ActionResult };

const createSaleSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  customerName: z.string().trim().min(1).max(100),
  cartons: z.coerce.number().int().positive(),
  pricePerCarton: z.coerce.number().positive(),
  paid: z.coerce.number().min(0),
  inventoryItemId: z.string().optional(),
});

export async function createSaleAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.salesWrite);

    const parsed = createSaleSchema.safeParse({
      cycleId: formData.get("cycleId"),
      date: formData.get("date"),
      customerName: formData.get("customerName"),
      cartons: formData.get("cartons"),
      pricePerCarton: formData.get("pricePerCarton"),
      paid: formData.get("paid") || "0",
      inventoryItemId: formData.get("inventoryItemId") || undefined,
    });

    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { cycleId, date, customerName, cartons, pricePerCarton, paid, inventoryItemId } =
      parsed.data;
    const total = Number((cartons * pricePerCarton).toFixed(2));

    if (paid > total) {
      return { ok: false, error: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" };
    }

    await assertCycleOpen(cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "Sale",
      entityId: (result: { id: string }) => result.id,
      mutate: async (tx) => {
        const sale = await tx.sale.create({
          data: {
            cycleId,
            date,
            customerName,
            cartons,
            pricePerCarton,
            total,
            paid,
            inventoryItemId: inventoryItemId ?? null,
          },
        });

        if (inventoryItemId) {
          await tx.inventoryTxn.create({
            data: {
              itemId: inventoryItemId,
              type: InventoryTxnType.OUT,
              qty: -cartons,
              saleId: sale.id,
            },
          });
        }

        return sale;
      },
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

const recordPaymentSchema = z.object({
  saleId: z.string().min(1),
  additionalPaid: z.coerce.number().positive(),
});

export async function recordPaymentAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.salesWrite);

    const parsed = recordPaymentSchema.safeParse({
      saleId: formData.get("saleId"),
      additionalPaid: formData.get("additionalPaid"),
    });

    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { saleId, additionalPaid } = parsed.data;
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { ok: false, error: "البيع غير موجود" };

    const newPaid = Number((Number(sale.paid) + additionalPaid).toFixed(2));
    if (newPaid > Number(sale.total)) {
      return { ok: false, error: "المبلغ المدفوع يتجاوز إجمالي الفاتورة" };
    }

    await assertCycleOpen(sale.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Sale",
      entityId: () => saleId,
      before: { paid: sale.paid },
      mutate: (tx) =>
        tx.sale.update({
          where: { id: saleId },
          data: { paid: newPaid },
        }),
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

const updateSaleSchema = z.object({
  date: z.coerce.date(),
  customerName: z.string().trim().min(1).max(100),
  cartons: z.coerce.number().int().positive(),
  pricePerCarton: z.coerce.number().positive(),
  paid: z.coerce.number().min(0),
});

export async function updateSaleAction(
  saleId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.salesWrite);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { ok: false, error: "البيع غير موجود" };

    await assertCycleOpen(sale.cycleId, { userRole: user.role });

    const parsed = updateSaleSchema.safeParse({
      date: formData.get("date"),
      customerName: formData.get("customerName"),
      cartons: formData.get("cartons"),
      pricePerCarton: formData.get("pricePerCarton"),
      paid: formData.get("paid") ?? "0",
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { date, customerName, cartons, pricePerCarton, paid } = parsed.data;
    const total = Number((cartons * pricePerCarton).toFixed(2));
    if (paid > total) return { ok: false, error: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Sale",
      entityId: () => saleId,
      before: { cartons: sale.cartons, pricePerCarton: sale.pricePerCarton, paid: sale.paid },
      mutate: async (tx) => {
        if (sale.inventoryItemId && cartons !== sale.cartons) {
          await tx.inventoryTxn.updateMany({
            where: { saleId },
            data: { qty: -cartons },
          });
        }
        return tx.sale.update({
          where: { id: saleId },
          data: { date, customerName, cartons, pricePerCarton, total, paid },
        });
      },
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function deleteSaleAction(saleId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.salesWrite);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { ok: false, error: "البيع غير موجود" };

    await assertCycleOpen(sale.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "Sale",
      entityId: () => saleId,
      before: { customerName: sale.customerName, total: sale.total },
      mutate: async (tx) => {
        await tx.inventoryTxn.deleteMany({ where: { saleId } });
        return tx.sale.delete({ where: { id: saleId } });
      },
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
