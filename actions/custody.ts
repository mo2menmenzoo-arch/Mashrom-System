"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
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
  category: z.enum(["OPERATING", "FOUNDING"]).default("OPERATING"),
  greenhouseId: z.string().min(1),
});

export async function createWithdrawalAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const parsed = withdrawalSchema.safeParse({
      cycleId: formData.get("cycleId"),
      date: formData.get("date"),
      description: formData.get("description"),
      amount: formData.get("amount"),
      category: formData.get("category") ?? "OPERATING",
      greenhouseId: formData.get("greenhouseId"),
    });

    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { cycleId, date, description, amount, category, greenhouseId } = parsed.data;
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
      mutate: async (tx) => {
        if (category === "OPERATING") {
          const expense = await tx.expense.create({
            data: {
              cycleId,
              date,
              description,
              amount,
              createdById: user.id,
            },
          });
          return tx.custodyWithdrawal.create({
            data: { cycleId, date, description, amount, category, expenseId: expense.id },
          });
        } else {
          const fe = await tx.foundingExpense.create({
            data: { greenhouseId, date, description, amount },
          });
          return tx.custodyWithdrawal.create({
            data: {
              cycleId,
              date,
              description,
              amount,
              category,
              foundingExpenseId: fe.id,
            },
          });
        }
      },
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

const updateDepositSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(200).optional(),
});

export async function updateDepositAction(
  depositId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const deposit = await prisma.custodyDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return { ok: false, error: "الإيداع غير موجود" };

    await assertCycleOpen(deposit.cycleId, { userRole: user.role });

    const parsed = updateDepositSchema.safeParse({
      date: formData.get("date"),
      amount: formData.get("amount"),
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "CustodyDeposit",
      entityId: () => depositId,
      before: { amount: deposit.amount },
      mutate: (tx) =>
        tx.custodyDeposit.update({
          where: { id: depositId },
          data: {
            date: parsed.data.date,
            amount: parsed.data.amount,
            notes: parsed.data.notes ?? null,
          },
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

export async function deleteDepositAction(depositId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const deposit = await prisma.custodyDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return { ok: false, error: "الإيداع غير موجود" };

    await assertCycleOpen(deposit.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "CustodyDeposit",
      entityId: () => depositId,
      before: { amount: deposit.amount },
      mutate: (tx) => tx.custodyDeposit.delete({ where: { id: depositId } }),
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

const updateWithdrawalSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
});

export async function updateWithdrawalAction(
  withdrawalId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const withdrawal = await prisma.custodyWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) return { ok: false, error: "الصرفية غير موجودة" };

    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role });

    const parsed = updateWithdrawalSchema.safeParse({
      date: formData.get("date"),
      description: formData.get("description"),
      amount: formData.get("amount"),
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const balanceWithoutThis = (await getCustodyBalance()) + Number(withdrawal.amount);
    if (parsed.data.amount > balanceWithoutThis) {
      return {
        ok: false,
        error: `المبلغ يتجاوز رصيد العهدة. الحد الأقصى: ${balanceWithoutThis.toFixed(2)} ج.م`,
      };
    }

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "CustodyWithdrawal",
      entityId: () => withdrawalId,
      before: { amount: withdrawal.amount, description: withdrawal.description },
      mutate: (tx) =>
        tx.custodyWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            date: parsed.data.date,
            description: parsed.data.description,
            amount: parsed.data.amount,
          },
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

export async function deleteWithdrawalAction(withdrawalId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const withdrawal = await prisma.custodyWithdrawal.findUnique({
      where: { id: withdrawalId },
    });
    if (!withdrawal) return { ok: false, error: "الصرفية غير موجودة" };

    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "CustodyWithdrawal",
      entityId: () => withdrawalId,
      before: { amount: withdrawal.amount, description: withdrawal.description },
      mutate: async (tx) => {
        if (withdrawal.expenseId) {
          await tx.expense.delete({ where: { id: withdrawal.expenseId } });
        }
        if (withdrawal.foundingExpenseId) {
          await tx.foundingExpense.delete({ where: { id: withdrawal.foundingExpenseId } });
        }
        return tx.custodyWithdrawal.delete({ where: { id: withdrawalId } });
      },
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
