"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuditAction, CycleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { computeCycleEnd } from "@/lib/cycle";

const createCycleSchema = z.object({
  startDate: z.coerce.date(),
  greenhouseId: z.string().min(1, "اختر الصوبة"),
  notes: z.string().trim().max(500).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCycleAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let created = false;
  try {
    const user = await requireRole(perms.cycleManage);

    const parsed = createCycleSchema.safeParse({
      startDate: formData.get("startDate"),
      greenhouseId: formData.get("greenhouseId"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0].message };
    }

    const { startDate, greenhouseId, notes } = parsed.data;

    const existingActive = await prisma.cycle.findFirst({
      where: { status: CycleStatus.ACTIVE, greenhouseId },
      select: { number: true },
    });
    if (existingActive) {
      return {
        ok: false,
        error: `يوجد دورة نشطة بالفعل في هذه الصوبة (دورة ${existingActive.number}) — أغلقها أولاً`,
      };
    }

    const last = await prisma.cycle.findFirst({
      where: { greenhouseId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (last?.number ?? 0) + 1;

    const settings = await prisma.greenhouseSettings.findUnique({
      where: { greenhouseId },
    });
    const cycleDuration = settings?.cycleDuration ?? 60;

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "Cycle",
      entityId: (cycle: { id: string }) => cycle.id,
      mutate: (tx) =>
        tx.cycle.create({
          data: {
            number: nextNumber,
            greenhouseId,
            startDate,
            endDate: computeCycleEnd(startDate, cycleDuration),
            status: CycleStatus.ACTIVE,
            notes: notes ?? null,
          },
        }),
    });

    revalidatePath("/cycles");
    revalidatePath("/dashboard");
    created = true;
  } catch (err) {
    console.error("[createCycleAction] Error:", err);
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
  if (created) redirect("/cycles");
  return { ok: true };
}

export async function closeCycleAction(cycleId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.cycleManage);

    const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) return { ok: false, error: "الدورة غير موجودة" };
    if (cycle.status === CycleStatus.ENDED) return { ok: false, error: "الدورة مغلقة بالفعل" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Cycle",
      entityId: () => cycleId,
      before: { status: cycle.status },
      mutate: (tx) =>
        tx.cycle.update({
          where: { id: cycleId },
          data: {
            status: CycleStatus.ENDED,
            closedAt: new Date(),
            closedById: user.id,
          },
        }),
    });
    revalidatePath("/cycles");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function deleteCycleAction(cycleId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.cycleManage);

    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        _count: {
          select: {
            sales: true,
            expenses: true,
            readings: true,
            deposits: true,
            withdrawals: true,
            inventory: true,
          },
        },
      },
    });
    if (!cycle) return { ok: false, error: "الدورة غير موجودة" };

    const total =
      cycle._count.sales +
      cycle._count.expenses +
      cycle._count.readings +
      cycle._count.deposits +
      cycle._count.withdrawals +
      cycle._count.inventory;

    if (total > 0) {
      return { ok: false, error: "لا يمكن حذف دورة تحتوي على بيانات" };
    }

    await prisma.cycle.delete({ where: { id: cycleId } });

    revalidatePath("/cycles");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
