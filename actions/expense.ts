"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction, InventorySource, InventoryTxnType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/cycle";

export type { ActionResult };

const createExpenseSchema = z.object({
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

export async function createExpenseAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.expenseWrite);
    const isInventoryPurchase = formData.get("isInventoryPurchase") === "true";

    const raw = {
      cycleId: formData.get("cycleId"),
      date: formData.get("date"),
      description: formData.get("description"),
      amount: formData.get("amount"),
      isInventoryPurchase,
      inventoryName: isInventoryPurchase ? formData.get("inventoryName") : undefined,
      inventoryQty: isInventoryPurchase ? formData.get("inventoryQty") : undefined,
      inventoryUnit: isInventoryPurchase ? (formData.get("inventoryUnit") || "وحدة") : undefined,
      inventoryExpiryDate:
        isInventoryPurchase && formData.get("inventoryExpiryDate")
          ? formData.get("inventoryExpiryDate")
          : undefined,
      inventoryLowStockAt:
        isInventoryPurchase && formData.get("inventoryLowStockAt")
          ? formData.get("inventoryLowStockAt")
          : undefined,
    };

    const parsed = createExpenseSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "بيانات غير صحيحة" };
    }

    const { cycleId, date, description, amount } = parsed.data;
    await assertCycleOpen(cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "Expense",
      entityId: (result: { id: string }) => result.id,
      mutate: async (tx) => {
        let inventoryItemId: string | undefined;

        if (isInventoryPurchase && parsed.data.inventoryName && parsed.data.inventoryQty) {
          const item = await tx.inventoryItem.create({
            data: {
              cycleId,
              name: parsed.data.inventoryName,
              initialQty: parsed.data.inventoryQty,
              unit: parsed.data.inventoryUnit ?? "وحدة",
              expiryDate: parsed.data.inventoryExpiryDate ?? null,
              lowStockAt: parsed.data.inventoryLowStockAt ?? null,
              source: InventorySource.DIRECT_PURCHASE,
            },
          });
          await tx.inventoryTxn.create({
            data: {
              itemId: item.id,
              type: InventoryTxnType.IN,
              qty: parsed.data.inventoryQty,
            },
          });
          inventoryItemId = item.id;
        }

        return tx.expense.create({
          data: {
            cycleId,
            date,
            description,
            amount,
            createdById: user.id,
            inventoryItemId: inventoryItemId ?? null,
          },
        });
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function deleteExpenseAction(
  expenseId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.expenseWrite);

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!expense) return { ok: false, error: "المصروف غير موجود" };

    await assertCycleOpen(expense.cycleId, {
      userRole: user.role,
      allowOverride: true,
      reason,
    });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "Expense",
      entityId: () => expenseId,
      before: { description: expense.description, amount: expense.amount },
      reason,
      mutate: async (tx) => {
        if (expense.inventoryItemId) {
          await tx.inventoryItem.delete({ where: { id: expense.inventoryItemId } });
        }
        return tx.expense.delete({ where: { id: expenseId } });
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
