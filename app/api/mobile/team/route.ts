import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { getUserEffectivePerms } from "@/lib/rbac";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export const GET = withMobileAuth(async (_req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, permissions: true } });
  const withPerms = await Promise.all(users.map(async (u) => ({ ...u, effectivePerms: await getUserEffectivePerms(u.id) })));
  return Response.json(withPerms);
});

const createSchema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().email(), password: z.string().min(8), role: z.enum(["ADMIN", "OPERATOR", "ACCOUNTANT", "VIEWER"]) });

export const POST = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return Response.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
  const hashed = await bcrypt.hash(parsed.data.password, 12);
  const newUser = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, password: hashed, role: parsed.data.role as Role, active: true }, select: { id: true, name: true, email: true, role: true } });
  return Response.json(newUser, { status: 201 });
});

const patchSchema = z.object({ userId: z.string().min(1), role: z.enum(["ADMIN", "OPERATOR", "ACCOUNTANT", "VIEWER"]).optional(), active: z.boolean().optional() });

export const PATCH = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { userId, role, active } = parsed.data;
  await prisma.user.update({ where: { id: userId }, data: { ...(role ? { role: role as Role } : {}), ...(active !== undefined ? { active } : {}) } });
  return Response.json({ ok: true });
});
