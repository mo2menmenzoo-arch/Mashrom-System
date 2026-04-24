"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/cycle";

export type { ActionResult };

const DEFAULT_ORG_ID = "default-org";

// ─── Create greenhouse ───────────────────────────────────────────────────────

const createGreenhouseSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(100),
  number: z.coerce.number().int().min(1).max(99),
});

export async function createGreenhouseAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.cycleManage); // ADMIN only

    const parsed = createGreenhouseSchema.safeParse({
      name: formData.get("name"),
      number: formData.get("number"),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

    const { name, number } = parsed.data;

    const existing = await prisma.greenhouse.findUnique({
      where: { organizationId_number: { organizationId: DEFAULT_ORG_ID, number } },
    });
    if (existing) return { ok: false, error: `الصوبة رقم ${number} موجودة بالفعل` };

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "Greenhouse",
      entityId: (gh: { id: string }) => gh.id,
      mutate: async (tx) => {
        const gh = await tx.greenhouse.create({
          data: { organizationId: DEFAULT_ORG_ID, name, number },
        });
        await tx.greenhouseSettings.create({ data: { greenhouseId: gh.id } });
        return gh;
      },
    });

    revalidatePath("/settings/greenhouses");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── Update greenhouse settings ──────────────────────────────────────────────

const settingsSchema = z.object({
  greenhouseId: z.string().min(1),
  temperature: z.coerce.number().min(0).max(50),
  humidity: z.coerce.number().min(0).max(100),
  cycleDuration: z.coerce.number().int().min(1).max(365),
});

export type SettingsResult = { success: true } | { success: false; error: string };

export async function updateGreenhouseSettingsAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  try {
    await requireRole(perms.cycleManage);

    const parsed = settingsSchema.safeParse({
      greenhouseId: formData.get("greenhouseId"),
      temperature: formData.get("temperature"),
      humidity: formData.get("humidity"),
      cycleDuration: formData.get("cycleDuration"),
    });
    if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

    const { greenhouseId, ...data } = parsed.data;

    await prisma.greenhouseSettings.upsert({
      where: { greenhouseId },
      create: { greenhouseId, ...data },
      update: data,
    });

    revalidatePath(`/settings/greenhouses/${greenhouseId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── Founding expenses ───────────────────────────────────────────────────────

const foundingExpenseSchema = z.object({
  greenhouseId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(300),
  notes: z.string().trim().max(300).optional(),
});

export async function createFoundingExpenseAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite); // ADMIN + ACCOUNTANT

    const parsed = foundingExpenseSchema.safeParse({
      greenhouseId: formData.get("greenhouseId"),
      date: formData.get("date"),
      amount: formData.get("amount"),
      description: formData.get("description"),
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

    const { greenhouseId, date, amount, description, notes } = parsed.data;

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "FoundingExpense",
      entityId: (fe: { id: string }) => fe.id,
      mutate: (tx) =>
        tx.foundingExpense.create({
          data: { greenhouseId, date, amount, description, notes: notes ?? null },
        }),
    });

    revalidatePath(`/settings/greenhouses/${greenhouseId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

const updateFoundingExpenseSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(300),
  notes: z.string().trim().max(300).optional(),
});

export async function updateFoundingExpenseAction(
  expenseId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const fe = await prisma.foundingExpense.findUnique({ where: { id: expenseId } });
    if (!fe) return { ok: false, error: "مصروف التأسيس غير موجود" };
    if (fe.custodyWithdrawalId) return { ok: false, error: "لا يمكن تعديل مصروف مرتبط بصرفية عهدة" };

    const parsed = updateFoundingExpenseSchema.safeParse({
      date: formData.get("date"),
      amount: formData.get("amount"),
      description: formData.get("description"),
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "FoundingExpense",
      entityId: () => expenseId,
      before: { amount: fe.amount, description: fe.description },
      mutate: (tx) =>
        tx.foundingExpense.update({
          where: { id: expenseId },
          data: {
            date: parsed.data.date,
            amount: parsed.data.amount,
            description: parsed.data.description,
            notes: parsed.data.notes ?? null,
          },
        }),
    });

    revalidatePath(`/settings/greenhouses/${fe.greenhouseId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function deleteFoundingExpenseAction(expenseId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const fe = await prisma.foundingExpense.findUnique({ where: { id: expenseId } });
    if (!fe) return { ok: false, error: "مصروف التأسيس غير موجود" };
    if (fe.custodyWithdrawalId) return { ok: false, error: "لا يمكن حذف مصروف مرتبط بصرفية عهدة — احذف الصرفية أولاً" };

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "FoundingExpense",
      entityId: () => expenseId,
      before: { amount: fe.amount, description: fe.description },
      mutate: (tx) => tx.foundingExpense.delete({ where: { id: expenseId } }),
    });

    revalidatePath(`/settings/greenhouses/${fe.greenhouseId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}
