# Settings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2-card settings hub with a professional sidebar-nav layout containing 7 sections: Account, Greenhouse Defaults, Financial, System & Data, Partner Profit Distribution, User Management, and Notifications.

**Architecture:** A new `app/(app)/settings/layout.tsx` wraps all `/settings/*` routes providing the ADMIN auth-check and the inner two-column layout (settings sidebar + content area). Each section is its own Next.js route. Account updates hit real server actions; Greenhouse/Financial/Partners persist to `localStorage`. Theme toggle uses `localStorage` + `document.documentElement.classList`.

**Tech Stack:** Next.js 15 App Router, React `useState`/`useEffect`, Prisma, bcryptjs, Tailwind CSS, existing shadcn components (`Card`, `Button`, `Input`, `Label`), Lucide icons.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `app/(app)/settings/layout.tsx` | **CREATE** | ADMIN auth-check + sidebar shell layout |
| `app/(app)/settings/settings-sidebar.tsx` | **CREATE** | Client nav component, highlights active route |
| `app/(app)/settings/page.tsx` | **REPLACE** | Redirect to `/settings/account` |
| `app/(app)/settings/account/page.tsx` | **CREATE** | Personal info + password change (server → client form) |
| `app/(app)/settings/greenhouse/page.tsx` | **CREATE** | Greenhouse defaults (localStorage) |
| `app/(app)/settings/financial/page.tsx` | **CREATE** | Currency + tax rate (localStorage) |
| `app/(app)/settings/system/page.tsx` | **CREATE** | Theme toggle + CSV export |
| `app/(app)/settings/partners/page.tsx` | **CREATE** | Partners page shell |
| `app/(app)/settings/partners/partners-form.tsx` | **CREATE** | `PartnerSharesForm` client component |
| `actions/settings.ts` | **CREATE** | `updateAccountAction`, `updatePasswordAction`, `exportAllDataAction` |
| `app/(app)/settings/users/page.tsx` | **UNCHANGED** | — |
| `app/(app)/settings/notifications/` | **UNCHANGED** | — |

---

## Task 1: Settings Layout Shell + Sidebar

**Files:**
- Create: `app/(app)/settings/layout.tsx`
- Create: `app/(app)/settings/settings-sidebar.tsx`

- [ ] **Step 1: Create `settings-sidebar.tsx`**

```tsx
// app/(app)/settings/settings-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Leaf, DollarSign, Settings, Users, Bell, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/settings/account",      icon: User,         label: "الحساب" },
  { href: "/settings/greenhouse",   icon: Leaf,         label: "إعدادات الصوبة" },
  { href: "/settings/financial",    icon: DollarSign,   label: "المالية" },
  { href: "/settings/system",       icon: Settings,     label: "النظام والبيانات" },
  { href: "/settings/partners",     icon: PieChart,     label: "توزيع الأرباح" },
  { href: "/settings/users",        icon: Users,        label: "المستخدمون" },
  { href: "/settings/notifications",icon: Bell,         label: "الإشعارات" },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          الإعدادات
        </p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `settings/layout.tsx`**

```tsx
// app/(app)/settings/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SettingsSidebar } from "./settings-sidebar";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex gap-8">
      <SettingsSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `settings/page.tsx` with a redirect**

```tsx
// app/(app)/settings/page.tsx
import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/settings/account");
}
```

- [ ] **Step 4: Remove ADMIN guard from existing sub-pages** (layout now handles it)

In `app/(app)/settings/users/page.tsx` remove lines:
```ts
const session = await auth();
if (session?.user?.role !== "ADMIN") redirect("/dashboard");
```
Also remove the import lines for `auth` and `redirect` if they become unused after removal.

In `app/(app)/settings/notifications/page.tsx` remove lines:
```ts
const session = await auth();
if (session?.user?.role !== "ADMIN") redirect("/dashboard");
```
Also remove the unused `auth`/`redirect` imports.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/settings/layout.tsx app/\(app\)/settings/settings-sidebar.tsx app/\(app\)/settings/page.tsx app/\(app\)/settings/users/page.tsx app/\(app\)/settings/notifications/page.tsx
git commit -m "feat: add settings layout with sidebar navigation"
```

---

## Task 2: Server Actions for Account

**Files:**
- Create: `actions/settings.ts`

- [ ] **Step 1: Create `actions/settings.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add actions/settings.ts
git commit -m "feat: add settings server actions (account, password, export)"
```

---

## Task 3: Account Settings Page

**Files:**
- Create: `app/(app)/settings/account/page.tsx`

- [ ] **Step 1: Create account page**

```tsx
// app/(app)/settings/account/page.tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock } from "lucide-react";
import { updateAccountAction, updatePasswordAction } from "@/actions/settings";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function AccountPage() {
  const [accountState, accountAction, accountPending] = useActionState(updateAccountAction, undefined);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePasswordAction, undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الحساب</h1>
        <p className="text-sm text-muted-foreground">تحديث معلوماتك الشخصية وكلمة المرور</p>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">المعلومات الشخصية</CardTitle>
            <CardDescription>اسمك وبريدك الإلكتروني الظاهر في النظام</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={accountAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input id="name" name="name" placeholder="أدخل اسمك" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email" placeholder="example@email.com" required />
              </div>
            </div>
            {accountState && (
              <Toast msg={accountState.success ? "تم حفظ المعلومات بنجاح" : accountState.error} ok={accountState.success} />
            )}
            <div className="flex justify-end gap-2">
              <Button type="reset" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                إلغاء
              </Button>
              <Button type="submit" disabled={accountPending}>
                {accountPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">تغيير كلمة المرور</CardTitle>
            <CardDescription>استخدم كلمة مرور قوية لا تقل عن 8 أحرف</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="current">كلمة المرور الحالية</Label>
                <Input id="current" name="current" type="password" placeholder="••••••••" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next">كلمة المرور الجديدة</Label>
                <Input id="next" name="next" type="password" placeholder="••••••••" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
                <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required />
              </div>
            </div>
            {passwordState && (
              <Toast msg={passwordState.success ? "تم تحديث كلمة المرور بنجاح" : passwordState.error} ok={passwordState.success} />
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={passwordPending}>
                {passwordPending ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/settings/account/page.tsx"
git commit -m "feat: add account settings page"
```

---

## Task 4: Greenhouse & Financial Pages (localStorage)

**Files:**
- Create: `app/(app)/settings/greenhouse/page.tsx`
- Create: `app/(app)/settings/financial/page.tsx`

- [ ] **Step 1: Create greenhouse page**

```tsx
// app/(app)/settings/greenhouse/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";

type GhDefaults = { temperature: number; humidity: number; duration: number };
const STORAGE_KEY = "gh_defaults";
const DEFAULTS: GhDefaults = { temperature: 22, humidity: 85, duration: 60 };

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function GreenhousePage() {
  const [values, setValues] = useState<GhDefaults>(DEFAULTS);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setValues(JSON.parse(stored));
    } catch {}
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    setToast({ msg: "تم الحفظ بنجاح", ok: true });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الصوبة</h1>
        <p className="text-sm text-muted-foreground">القيم الافتراضية عند إنشاء دورة جديدة</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">القيم الافتراضية للصوبة</CardTitle>
            <CardDescription>درجة الحرارة والرطوبة المستهدفة ومدة الدورة</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="temperature">درجة الحرارة المستهدفة (°م)</Label>
                <Input
                  id="temperature" type="number" min={0} max={50}
                  value={values.temperature}
                  onChange={(e) => setValues((v) => ({ ...v, temperature: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="humidity">الرطوبة المستهدفة (%)</Label>
                <Input
                  id="humidity" type="number" min={0} max={100}
                  value={values.humidity}
                  onChange={(e) => setValues((v) => ({ ...v, humidity: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">مدة الدورة (يوم)</Label>
                <Input
                  id="duration" type="number" min={1} max={365}
                  value={values.duration}
                  onChange={(e) => setValues((v) => ({ ...v, duration: Number(e.target.value) }))}
                />
              </div>
            </div>
            {toast && <Toast msg={toast.msg} ok={toast.ok} />}
            <div className="flex justify-end">
              <Button type="submit">حفظ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create financial page**

```tsx
// app/(app)/settings/financial/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

type FinDefaults = { currency: "EGP" | "USD"; taxRate: number };
const STORAGE_KEY = "fin_defaults";
const DEFAULTS: FinDefaults = { currency: "EGP", taxRate: 0 };

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function FinancialPage() {
  const [values, setValues] = useState<FinDefaults>(DEFAULTS);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setValues(JSON.parse(stored));
    } catch {}
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    setToast({ msg: "تم الحفظ بنجاح", ok: true });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات المالية</h1>
        <p className="text-sm text-muted-foreground">العملة الافتراضية ونسبة الضريبة</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">الإعدادات المالية الافتراضية</CardTitle>
            <CardDescription>تُستخدم كقيم مرجعية في تقارير النظام</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="currency">العملة الافتراضية</Label>
                <select
                  id="currency"
                  value={values.currency}
                  onChange={(e) => setValues((v) => ({ ...v, currency: e.target.value as "EGP" | "USD" }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxRate">نسبة الضريبة (%)</Label>
                <Input
                  id="taxRate" type="number" min={0} max={100} step={0.1}
                  value={values.taxRate}
                  onChange={(e) => setValues((v) => ({ ...v, taxRate: Number(e.target.value) }))}
                />
              </div>
            </div>
            {toast && <Toast msg={toast.msg} ok={toast.ok} />}
            <div className="flex justify-end">
              <Button type="submit">حفظ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/settings/greenhouse/page.tsx" "app/(app)/settings/financial/page.tsx"
git commit -m "feat: add greenhouse and financial settings pages"
```

---

## Task 5: System & Data Page (Theme + Export)

**Files:**
- Create: `app/(app)/settings/system/page.tsx`

- [ ] **Step 1: Create system page**

```tsx
// app/(app)/settings/system/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Moon, Download } from "lucide-react";
import { exportAllDataAction } from "@/actions/settings";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function SystemPage() {
  const [dark, setDark] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportAllDataAction();
      if (!result.success) {
        setToast({ msg: result.error, ok: false });
        return;
      }
      const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "تم تصدير البيانات بنجاح", ok: true });
    } finally {
      setExporting(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">النظام والبيانات</h1>
        <p className="text-sm text-muted-foreground">إعدادات المظهر وتصدير البيانات</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">النظام والبيانات</CardTitle>
            <CardDescription>تحكم في مظهر التطبيق وتصدير جميع البيانات</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Toggle */}
          <div>
            <p className="mb-3 text-sm font-semibold">المظهر</p>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{dark ? "الوضع الليلي" : "الوضع النهاري"}</p>
                <p className="text-xs text-muted-foreground">تبديل مظهر التطبيق</p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted transition-colors hover:bg-muted/70"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Export */}
          <div>
            <p className="mb-3 text-sm font-semibold">تصدير البيانات</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled={exporting} onClick={handleExport}>
                <Download className="me-2 h-4 w-4" />
                {exporting ? "جارٍ التصدير…" : "تصدير CSV"}
              </Button>
              <Button variant="outline" disabled={exporting} onClick={handleExport}>
                <Download className="me-2 h-4 w-4" />
                {exporting ? "جارٍ التصدير…" : "تصدير Excel"}
              </Button>
            </div>
          </div>

          {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/settings/system/page.tsx"
git commit -m "feat: add system settings page with theme toggle and CSV export"
```

---

## Task 6: Partner Profit Distribution

**Files:**
- Create: `app/(app)/settings/partners/partners-form.tsx`
- Create: `app/(app)/settings/partners/page.tsx`

- [ ] **Step 1: Create `partners-form.tsx`**

```tsx
// app/(app)/settings/partners/partners-form.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Partner = { id: string; name: string; share: number };
const STORAGE_KEY = "partner_shares";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export function PartnerSharesForm() {
  const [partners, setPartners] = useState<Partner[]>([
    { id: crypto.randomUUID(), name: "", share: 0 },
  ]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setPartners(parsed);
      }
    } catch {}
  }, []);

  const total = partners.reduce((sum, p) => sum + (Number(p.share) || 0), 0);
  const overLimit = total > 100;

  function addPartner() {
    setPartners((prev) => [...prev, { id: crypto.randomUUID(), name: "", share: 0 }]);
  }

  function removePartner(id: string) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePartner(id: string, field: keyof Omit<Partner, "id">, value: string | number) {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function handleSave() {
    if (overLimit) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
    setToast({ msg: "تم حفظ توزيع الأرباح بنجاح", ok: true });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_120px_40px] gap-3 px-1">
        <p className="text-xs font-medium text-muted-foreground">اسم الشريك</p>
        <p className="text-xs font-medium text-muted-foreground">النسبة (%)</p>
        <span />
      </div>

      {/* Partner rows */}
      {partners.map((partner) => (
        <div key={partner.id} className="grid grid-cols-[1fr_120px_40px] items-center gap-3">
          <Input
            placeholder="اسم الشريك"
            value={partner.name}
            onChange={(e) => updatePartner(partner.id, "name", e.target.value)}
          />
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={partner.share}
            onChange={(e) => updatePartner(partner.id, "share", Number(e.target.value))}
          />
          <button
            type="button"
            onClick={() => removePartner(partner.id)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Add partner */}
      <Button type="button" variant="outline" size="sm" onClick={addPartner} className="gap-2">
        <Plus className="h-4 w-4" />
        إضافة شريك
      </Button>

      {/* Total bar */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium",
          total === 100
            ? "border-green-500/30 bg-green-500/10 text-green-600"
            : overLimit
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-amber-500/30 bg-amber-500/10 text-amber-600",
        )}
      >
        <span>الإجمالي: {total.toFixed(1)}%</span>
        {overLimit && <span>تجاوز 100%! يرجى تصحيح النسب.</span>}
        {!overLimit && total < 100 && <span>المتبقي: {(100 - total).toFixed(1)}%</span>}
        {total === 100 && <span>✓ مكتمل</span>}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={overLimit}>
          حفظ التوزيع
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `partners/page.tsx`**

```tsx
// app/(app)/settings/partners/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import { PartnerSharesForm } from "./partners-form";

export default function PartnersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">توزيع أرباح الشركاء</h1>
        <p className="text-sm text-muted-foreground">تحكم في توزيع صافي الربح بين الشركاء بالنسب المئوية</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">النسبة المئوية للشركاء</CardTitle>
            <CardDescription>تحكم في توزيع صافي الربح بين الشركاء بالنسب المئوية.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PartnerSharesForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/settings/partners/partners-form.tsx" "app/(app)/settings/partners/page.tsx"
git commit -m "feat: add partner profit distribution settings"
```

---

## Task 7: Push to GitHub + Vercel Deploy

- [ ] **Step 1: Push all commits to main**

```bash
git push origin HEAD:main
```

Expected: Vercel picks up the push and starts a deployment automatically. Check [Vercel Dashboard](https://vercel.com) → Deployments to confirm.

---

## Self-Review Checklist

- [x] Spec section 1 (Account) → Task 3
- [x] Spec section 2 (Greenhouse) → Task 4
- [x] Spec section 3 (Financial) → Task 4
- [x] Spec section 4 (System & Data) → Task 5
- [x] Spec section 5 (Partners) → Task 6
- [x] Spec section 6 (Users) → sidebar links to existing `/settings/users` ✓
- [x] Spec section 7 (Notifications) → sidebar links to existing `/settings/notifications` ✓
- [x] Sidebar with active state via `usePathname()` → Task 1
- [x] ADMIN auth guard in layout → Task 1
- [x] Toast feedback after save → all tasks include `Toast` component
- [x] Cancel button with red border → Task 3
- [x] localStorage persistence for Greenhouse/Financial/Partners → Tasks 4, 6
- [x] Export CSV action → Task 2 + Task 5
- [x] RTL-compatible layout (Tailwind RTL classes) → all tasks
- [x] Deploy to Vercel → Task 7
