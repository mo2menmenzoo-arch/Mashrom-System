import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export const GET = withMobileAuth(async () => {
  const greenhouses = await prisma.greenhouse.findMany({ orderBy: { number: "asc" }, include: { settings: true, _count: { select: { cycles: true } } } });
  return Response.json(greenhouses);
});

const createSchema = z.object({ name: z.string().trim().min(1).max(100) });

export const POST = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const last = await prisma.greenhouse.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const nextNumber = (last?.number ?? 0) + 1;
  const gh = await prisma.greenhouse.create({ data: { name: parsed.data.name, number: nextNumber, organizationId: "default-org" } });
  return Response.json(gh, { status: 201 });
});
