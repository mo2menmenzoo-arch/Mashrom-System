import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { cycleDayNumber } from "@/lib/cycle";
import { AuditAction, Role } from "@prisma/client";
import { MEDICINE_OPTIONS } from "@/lib/medicines";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const readings = await prisma.operationReading.findMany({ where: cycleId ? { cycleId } : undefined, orderBy: { date: "desc" } });
  return Response.json(readings);
});

const createSchema = z.object({ cycleId: z.string().min(1), date: z.coerce.date(), temperature: z.coerce.number().min(-50).max(100).optional(), humidity: z.coerce.number().min(0).max(100).optional(), co2: z.coerce.number().int().min(0).max(9999).optional(), cleanliness: z.enum(["EXCELLENT", "GOOD", "ACCEPTABLE", "POOR"]).optional(), notes: z.string().trim().max(500).optional(), watered: z.boolean().optional(), medicines: z.array(z.enum(MEDICINE_OPTIONS)).optional() });

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.operationsWrite.includes(user.role as Role)) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { cycleId, date, temperature, humidity, co2, cleanliness, notes, watered, medicines } = parsed.data;
  await assertCycleOpen(cycleId, { userRole: user.role as Role });
  const existing = await prisma.operationReading.findUnique({ where: { cycleId_date: { cycleId, date } } });
  if (existing) return Response.json({ error: "تم تسجيل قراءة لهذا اليوم بالفعل" }, { status: 409 });
  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId }, select: { startDate: true } });
  if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });
  const dayNumber = cycleDayNumber(cycle.startDate, date);
  const reading = await withAudit({ userId: user.id, action: AuditAction.CREATE, entity: "OperationReading", entityId: (r: { id: string }) => r.id, mutate: (tx) => tx.operationReading.create({ data: { cycleId, date, dayNumber, temperature: temperature ?? null, humidity: humidity ?? null, co2: co2 ?? null, cleanliness: cleanliness ?? null, notes: notes ?? null, watered: watered ?? false, medicines: medicines ?? [] } }) });
  return Response.json(reading, { status: 201 });
});
