"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction, CycleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { computeCycleEnd } from "@/lib/cycle";

const createCycleSchema = z.object({
  startDate: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCycleAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.cycleManage);

    const parsed = createCycleSchema.safeParse({
      startDate: formData.get("startDate"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: "بيانات غير صحيحة" };
    }

    const last = await prisma.cycle.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (last?.number ?? 0) + 1;

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "Cycle",
      entityId: (cycle: { id: string }) => cycle.id,
      mutate: (tx) =>
        tx.cycle.create({
          data: {
            number: nextNumber,
            startDate: parsed.data.startDate,
            endDate: computeCycleEnd(parsed.data.startDate),
            status: CycleStatus.ACTIVE,
            notes: parsed.data.notes ?? null,
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
