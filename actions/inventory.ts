"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction, InventoryTxnType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/cycle";

export type { ActionResult };

// ─── Add Item ────────────────────────────────────────────────────────────────

const addItemSchema = z.object({
  cycleId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  initialQty: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(20).default("وحدة"),
  expiryDate: z.coerce.date().optional(),
  lowStockAt: z.coerce.number().positive().optional(),
});

export async function addInventoryItemAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const raw = {
      cycleId: formData.get("cycleId"),
      name: formData.get("name"),
      initialQty: formData.get("initialQty"),
      unit: formData.get("unit") || "وحدة",
      expiryDate: formData.get("expiryDate") || undefined,
      lowStockAt: formData.get("lowStockAt") || undefined,
    };

    const parsed = addItemSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await assertCycleOpen(parsed.data.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "InventoryItem",
      entityId: (result: { id: string }) => result.id,
      mutate: async (tx) => {
        const item = await tx.inventoryItem.create({
          data: {
            cycleId: parsed.data.cycleId,
            name: parsed.data.name,
            initialQty: parsed.data.initialQty,
            unit: parsed.data.unit,
            expiryDate: parsed.data.expiryDate ?? null,
            lowStockAt: parsed.data.lowStockAt ?? null,
            source: "DIRECT_PURCHASE",
          },
        });
        await tx.inventoryTxn.create({
          data: {
            itemId: item.id,
            type: InventoryTxnType.IN,
            qty: parsed.data.initialQty,
          },
        });
        return item;
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

// ─── Update Item ──────────────────────────────────────────────────────────────

const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(20),
  expiryDate: z.coerce.date().optional(),
  lowStockAt: z.coerce.number().positive().optional(),
});

export async function updateInventoryItemAction(
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "الصنف غير موجود" };

    await assertCycleOpen(item.cycleId, { userRole: user.role });

    const parsed = updateItemSchema.safeParse({
      name: formData.get("name"),
      unit: formData.get("unit") || "وحدة",
      expiryDate: formData.get("expiryDate") || undefined,
      lowStockAt: formData.get("lowStockAt") || undefined,
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "InventoryItem",
      entityId: () => itemId,
      before: { name: item.name, unit: item.unit },
      mutate: (tx) =>
        tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            name: parsed.data.name,
            unit: parsed.data.unit,
            expiryDate: parsed.data.expiryDate ?? null,
            lowStockAt: parsed.data.lowStockAt ?? null,
          },
        }),
    });

    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

// ─── Delete Item ──────────────────────────────────────────────────────────────

export async function deleteInventoryItemAction(itemId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "الصنف غير موجود" };

    if (item.source === "OPERATING_EXPENSE") {
      return { ok: false, error: "لا يمكن حذف صنف مرتبط بمصروف. احذف المصروف بدلاً من ذلك." };
    }

    await assertCycleOpen(item.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "InventoryItem",
      entityId: () => itemId,
      before: { name: item.name },
      mutate: (tx) => tx.inventoryItem.delete({ where: { id: itemId } }),
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

// ─── Add Transaction ──────────────────────────────────────────────────────────

const addTxnSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUST"]),
  qty: z.coerce.number().positive(),
  reason: z.string().trim().max(200).optional(),
});

export async function addInventoryTxnAction(
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "الصنف غير موجود" };

    await assertCycleOpen(item.cycleId, { userRole: user.role });

    const parsed = addTxnSchema.safeParse({
      type: formData.get("type"),
      qty: formData.get("qty"),
      reason: formData.get("reason") || undefined,
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    // OUT and ADJUST stored as negative qty
    const signedQty =
      parsed.data.type === "IN" ? parsed.data.qty : -parsed.data.qty;

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "InventoryTxn",
      entityId: (result: { id: string }) => result.id,
      mutate: (tx) =>
        tx.inventoryTxn.create({
          data: {
            itemId,
            type: parsed.data.type as InventoryTxnType,
            qty: signedQty,
            reason: parsed.data.reason ?? null,
          },
        }),
    });

    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
