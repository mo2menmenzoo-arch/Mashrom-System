"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { requireRole, perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCustodyBalance } from "@/lib/custody";
import type { ActionResult } from "@/actions/cycle";

export type { ActionResult };

const depositSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(200).optional(),
});

export async function createDepositAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const parsed = depositSchema.safeParse({
      cycleId: formData.get("cycleId"),
      date: formData.get("date"),
      amount: formData.get("amount"),
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { cycleId, date, amount, notes } = parsed.data;
    await assertCycleOpen(cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "CustodyDeposit",
      entityId: (result: { id: string }) => result.id,
      mutate: (tx) =>
        tx.custodyDeposit.create({
          data: { cycleId, date, amount, notes: notes ?? null },
        }),
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

const withdrawalSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
});

export async function createWithdrawalAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const parsed = withdrawalSchema.safeParse({
      cycleId: formData.get("cycleId"),
      date: formData.get("date"),
      description: formData.get("description"),
      amount: formData.get("amount"),
    });

    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { cycleId, date, description, amount } = parsed.data;
    await assertCycleOpen(cycleId, { userRole: user.role });

    const balance = await getCustodyBalance();
    if (amount > balance) {
      return {
        ok: false,
        error: `رصيد العهدة غير كافٍ. الرصيد الحالي: ${balance.toFixed(2)} ج.م`,
      };
    }

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "CustodyWithdrawal",
      entityId: (result: { id: string }) => result.id,
      mutate: (tx) =>
        tx.custodyWithdrawal.create({
          data: { cycleId, date, description, amount },
        }),
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
