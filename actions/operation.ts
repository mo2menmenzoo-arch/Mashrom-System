"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { cycleDayNumber } from "@/lib/cycle";
import type { ActionResult } from "@/actions/cycle";

export type { ActionResult };

const readingSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  temperature: z.coerce.number().min(-50).max(100).optional(),
  humidity: z.coerce.number().min(0).max(100).optional(),
  co2: z.coerce.number().int().min(0).max(9999).optional(),
  cleanliness: z.enum(["EXCELLENT", "GOOD", "ACCEPTABLE", "POOR"]).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function createOperationReadingAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.operationsWrite);

    const parsed = readingSchema.safeParse({
      cycleId: formData.get("cycleId"),
      date: formData.get("date"),
      temperature: formData.get("temperature") || undefined,
      humidity: formData.get("humidity") || undefined,
      co2: formData.get("co2") || undefined,
      cleanliness: formData.get("cleanliness") || undefined,
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { cycleId, date, temperature, humidity, co2, cleanliness, notes } = parsed.data;
    await assertCycleOpen(cycleId, { userRole: user.role });

    const existing = await prisma.operationReading.findUnique({
      where: { cycleId_date: { cycleId, date } },
    });
    if (existing) return { ok: false, error: "تم تسجيل قراءة لهذا اليوم بالفعل" };

    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      select: { startDate: true },
    });
    if (!cycle) return { ok: false, error: "الدورة غير موجودة" };

    const dayNumber = cycleDayNumber(cycle.startDate, date);

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "OperationReading",
      entityId: (result: { id: string }) => result.id,
      mutate: (tx) =>
        tx.operationReading.create({
          data: {
            cycleId,
            date,
            dayNumber,
            temperature: temperature ?? null,
            humidity: humidity ?? null,
            co2: co2 ?? null,
            cleanliness: cleanliness ?? null,
            notes: notes ?? null,
          },
        }),
    });

    revalidatePath("/operations");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function updateOperationReadingAction(
  readingId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.operationsWrite);

    const reading = await prisma.operationReading.findUnique({ where: { id: readingId } });
    if (!reading) return { ok: false, error: "القراءة غير موجودة" };

    await assertCycleOpen(reading.cycleId, { userRole: user.role });

    const parsed = readingSchema.partial().safeParse({
      temperature: formData.get("temperature") || undefined,
      humidity: formData.get("humidity") || undefined,
      co2: formData.get("co2") || undefined,
      cleanliness: formData.get("cleanliness") || undefined,
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "OperationReading",
      entityId: () => readingId,
      before: {
        temperature: reading.temperature,
        humidity: reading.humidity,
        co2: reading.co2,
        cleanliness: reading.cleanliness,
      },
      mutate: (tx) =>
        tx.operationReading.update({
          where: { id: readingId },
          data: {
            temperature: parsed.data.temperature ?? null,
            humidity: parsed.data.humidity ?? null,
            co2: parsed.data.co2 ?? null,
            cleanliness: parsed.data.cleanliness ?? null,
            notes: parsed.data.notes ?? null,
          },
        }),
    });

    revalidatePath("/operations");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
