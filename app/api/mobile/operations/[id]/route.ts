import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";
import { MEDICINE_OPTIONS } from "@/lib/medicines";

const updateSchema = z.object({ temperature: z.coerce.number().min(-50).max(100).optional(), humidity: z.coerce.number().min(0).max(100).optional(), co2: z.coerce.number().int().min(0).max(9999).optional(), cleanliness: z.enum(["EXCELLENT", "GOOD", "ACCEPTABLE", "POOR"]).optional(), notes: z.string().trim().max(500).optional(), watered: z.boolean().optional(), medicines: z.array(z.enum(MEDICINE_OPTIONS)).optional() });

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.operationsWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const reading = await prisma.operationReading.findUnique({ where: { id } });
  if (!reading) return Response.json({ error: "القراءة غير موجودة" }, { status: 404 });
  await assertCycleOpen(reading.cycleId, { userRole: user.role as Role });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  await withAudit({ userId: user.id, action: AuditAction.UPDATE, entity: "OperationReading", entityId: () => id, before: { temperature: reading.temperature, humidity: reading.humidity }, mutate: (tx) => tx.operationReading.update({ where: { id }, data: { temperature: parsed.data.temperature ?? null, humidity: parsed.data.humidity ?? null, co2: parsed.data.co2 ?? null, cleanliness: parsed.data.cleanliness ?? null, notes: parsed.data.notes ?? null, watered: parsed.data.watered ?? false, medicines: parsed.data.medicines ?? [] } }) });
  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.operationsWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;
  const reading = await prisma.operationReading.findUnique({ where: { id } });
  if (!reading) return Response.json({ error: "القراءة غير موجودة" }, { status: 404 });
  await assertCycleOpen(reading.cycleId, { userRole: user.role as Role });
  await withAudit({ userId: user.id, action: AuditAction.DELETE, entity: "OperationReading", entityId: () => id, before: { date: reading.date }, mutate: (tx) => tx.operationReading.delete({ where: { id } }) });
  return Response.json({ ok: true });
});
