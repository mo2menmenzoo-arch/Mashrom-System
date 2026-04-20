// actions/settings.ts
"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type SettingsResult = { success: true } | { success: false; error: string };

const accountSchema = z.object({
  name:  z.string().trim().min(1, "الاسم مطلوب").max(100),
  email: z.string().email("بريد إلكتروني غير صالح"),
});

export async function updateAccountAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };

  const parsed = accountSchema.safeParse({
    name:  formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const { name, email } = parsed.data;
  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: session.user.id } },
  });
  if (existing) return { success: false, error: "البريد الإلكتروني مستخدم بالفعل" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, email },
  });
  revalidatePath("/settings/account");
  return { success: true };
}

const passwordSchema = z.object({
  current:  z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  next:     z.string().min(8, "كلمة المرور الجديدة لا تقل عن 8 أحرف"),
  confirm:  z.string().min(1),
}).refine((d) => d.next === d.confirm, { message: "كلمتا المرور غير متطابقتين", path: ["confirm"] });

export async function updatePasswordAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };

  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next:    formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) return { success: false, error: "لا يمكن تغيير كلمة المرور لهذا الحساب" };

  const ok = await bcrypt.compare(parsed.data.current, user.password);
  if (!ok) return { success: false, error: "كلمة المرور الحالية غير صحيحة" };

  const hashed = await bcrypt.hash(parsed.data.next, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } });
  return { success: true };
}

export async function exportAllDataAction(): Promise<SettingsResult & { csv?: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const [sales, expenses, custody, inventory] = await Promise.all([
    prisma.sale.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.custodyTransaction.findMany({ orderBy: { date: "desc" } }),
    prisma.inventoryItem.findMany({ orderBy: { number: "desc" } }),
  ]);

  const rows: string[] = ["النوع,التاريخ,الوصف,المبلغ,الدورة"];

  for (const s of sales) {
    rows.push(`مبيعات,${s.date.toISOString().slice(0, 10)},"${s.customerName}",${s.totalPrice},${s.cycle.number}`);
  }
  for (const e of expenses) {
    rows.push(`مصروف,${e.date.toISOString().slice(0, 10)},"${e.description}",${e.amount},${e.cycle.number}`);
  }
  for (const c of custody) {
    rows.push(`عهدة,${c.date.toISOString().slice(0, 10)},"${c.description ?? ""}",${c.type === "DEPOSIT" ? c.amount : -c.amount},-`);
  }
  for (const i of inventory) {
    rows.push(`مخزن,-,"${i.name}",${i.currentQty},-`);
  }

  return { success: true, csv: rows.join("\n") };
}
