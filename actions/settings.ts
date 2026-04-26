// actions/settings.ts
"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

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

  const [sales, expenses, deposits, withdrawals, inventory] = await Promise.all([
    prisma.sale.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.custodyDeposit.findMany({ orderBy: { date: "desc" } }),
    prisma.custodyWithdrawal.findMany({ orderBy: { date: "desc" } }),
    prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const rows: string[] = ["النوع,التاريخ,الوصف,المبلغ,الدورة"];

  for (const s of sales) {
    rows.push(`مبيعات,${s.date.toISOString().slice(0, 10)},"${s.customerName}",${s.total},${s.cycle.number}`);
  }
  for (const e of expenses) {
    rows.push(`مصروف,${e.date.toISOString().slice(0, 10)},"${e.description}",${e.amount},${e.cycle.number}`);
  }
  for (const d of deposits) {
    rows.push(`إيداع عهدة,${d.date.toISOString().slice(0, 10)},"${d.notes ?? ""}",${d.amount},-`);
  }
  for (const w of withdrawals) {
    rows.push(`صرف عهدة,${w.date.toISOString().slice(0, 10)},"${w.description}",-${w.amount},-`);
  }
  for (const i of inventory) {
    rows.push(`مخزن,-,"${i.name}",${i.initialQty},-`);
  }

  return { success: true, csv: rows.join("\n") };
}

// ─── Org helpers ────────────────────────────────────────────────────────────

const DEFAULT_ORG_ID = "default-org";

export type OrgSettings = {
  financial: { currency: string; taxRate: number };
  partners: { id: string; name: string; sharePercent: number; position: number }[];
};

export async function getOrgSettingsAction(): Promise<OrgSettings> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("غير مصرح");

  const [fin, partners] = await Promise.all([
    prisma.financialSettings.upsert({
      where: { organizationId: DEFAULT_ORG_ID },
      create: { organizationId: DEFAULT_ORG_ID },
      update: {},
    }),
    prisma.partner.findMany({
      where: { organizationId: DEFAULT_ORG_ID },
      orderBy: { position: "asc" },
    }),
  ]);

  return {
    financial: { currency: fin.currency, taxRate: fin.taxRate },
    partners: partners.map((p) => ({ id: p.id, name: p.name, sharePercent: p.sharePercent, position: p.position })),
  };
}

// ─── Financial ───────────────────────────────────────────────────────────────

const financialSchema = z.object({
  currency: z.enum(["EGP", "USD"]),
  taxRate: z.coerce.number().min(0).max(100),
});

export async function updateFinancialSettingsAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const parsed = financialSchema.safeParse({
    currency: formData.get("currency"),
    taxRate: formData.get("taxRate"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  await prisma.financialSettings.upsert({
    where: { organizationId: DEFAULT_ORG_ID },
    create: { organizationId: DEFAULT_ORG_ID, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/settings/financial");
  return { success: true };
}

// ─── Partners ────────────────────────────────────────────────────────────────

const partnersSchema = z.array(
  z.object({
    name: z.string().trim().min(1, "اسم الشريك مطلوب"),
    sharePercent: z.number().min(0).max(100),
    position: z.number().int().min(0),
  }),
);

export async function updatePartnersAction(
  partners: { name: string; sharePercent: number; position: number }[],
): Promise<SettingsResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const parsed = partnersSchema.safeParse(partners);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const total = parsed.data.reduce((s, p) => s + p.sharePercent, 0);
  if (total > 100) return { success: false, error: "إجمالي النسب يتجاوز 100%" };

  await prisma.$transaction([
    prisma.partner.deleteMany({ where: { organizationId: DEFAULT_ORG_ID } }),
    prisma.partner.createMany({
      data: parsed.data.map((p) => ({ ...p, organizationId: DEFAULT_ORG_ID })),
    }),
  ]);
  revalidatePath("/settings/partners");
  return { success: true };
}

// ─── Theme preference ────────────────────────────────────────────────────────

export async function updateThemePreferenceAction(theme: "light" | "dark"): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };

  await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, theme },
    update: { theme },
  });
  return { success: true };
}

// ─── Excel export ────────────────────────────────────────────────────────────

export async function exportExcelAction(): Promise<SettingsResult & { base64?: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const [sales, expenses, deposits, withdrawals, inventory] = await Promise.all([
    prisma.sale.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.custodyDeposit.findMany({ orderBy: { date: "desc" } }),
    prisma.custodyWithdrawal.findMany({ orderBy: { date: "desc" } }),
    prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      sales.map((s) => ({
        التاريخ: s.date.toISOString().slice(0, 10),
        العميل: s.customerName,
        الكراتين: s.cartons,
        "سعر الكرتون": Number(s.pricePerCarton),
        الإجمالي: Number(s.total),
        المدفوع: Number(s.paid),
        الدورة: s.cycle.number,
      })),
    ),
    "مبيعات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      expenses.map((e) => ({
        التاريخ: e.date.toISOString().slice(0, 10),
        الوصف: e.description,
        المبلغ: Number(e.amount),
        الدورة: e.cycle.number,
      })),
    ),
    "مصروفات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      deposits.map((d) => ({
        التاريخ: d.date.toISOString().slice(0, 10),
        المبلغ: Number(d.amount),
        ملاحظات: d.notes ?? "",
      })),
    ),
    "إيداعات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      withdrawals.map((w) => ({
        التاريخ: w.date.toISOString().slice(0, 10),
        الوصف: w.description,
        المبلغ: Number(w.amount),
      })),
    ),
    "صرفيات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      inventory.map((i) => ({
        الاسم: i.name,
        "الكمية الأولية": Number(i.initialQty),
        الوحدة: i.unit,
      })),
    ),
    "مخزن",
  );

  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return { success: true, base64 };
}

// ─── Print data ───────────────────────────────────────────────────────────────

export type PrintData = {
  sales: { date: string; customerName: string; cartons: number; total: number; cycle: number }[];
  expenses: { date: string; description: string; amount: number; cycle: number }[];
  deposits: { date: string; amount: number; notes: string }[];
  withdrawals: { date: string; description: string; amount: number }[];
  inventory: { name: string; initialQty: number; unit: string }[];
};

export async function getPrintDataAction(): Promise<SettingsResult & { data?: PrintData }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const [sales, expenses, deposits, withdrawals, inventory] = await Promise.all([
    prisma.sale.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.custodyDeposit.findMany({ orderBy: { date: "desc" } }),
    prisma.custodyWithdrawal.findMany({ orderBy: { date: "desc" } }),
    prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return {
    success: true,
    data: {
      sales: sales.map((s) => ({ date: s.date.toISOString().slice(0, 10), customerName: s.customerName, cartons: s.cartons, total: Number(s.total), cycle: s.cycle.number })),
      expenses: expenses.map((e) => ({ date: e.date.toISOString().slice(0, 10), description: e.description, amount: Number(e.amount), cycle: e.cycle.number })),
      deposits: deposits.map((d) => ({ date: d.date.toISOString().slice(0, 10), amount: Number(d.amount), notes: d.notes ?? "" })),
      withdrawals: withdrawals.map((w) => ({ date: w.date.toISOString().slice(0, 10), description: w.description, amount: Number(w.amount) })),
      inventory: inventory.map((i) => ({ name: i.name, initialQty: Number(i.initialQty), unit: i.unit })),
    },
  };
}
