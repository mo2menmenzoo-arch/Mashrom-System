# Stability & UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix theme persistence from DB (no FOUC), split per-button loading states, and unify Toast feedback across all settings forms.

**Architecture:** Three independent improvements — (1) inline anti-flash script + ThemeSync client component fed from the app layout server component, (2) split `busy` state into three in system/page, (3) extract reusable `ActionToast` component and apply to all settings forms. No new DB migrations needed.

**Tech Stack:** Next.js 15 App Router, React 19 (`useActionState`, `useTransition`), Prisma 5, Tailwind CSS, TypeScript, shadcn/ui, Lucide icons.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/layout.tsx` | Modify | Add inline anti-flash `<script>` in `<head>` |
| `components/theme-sync.tsx` | Create | Client component — applies DB theme on mount, syncs localStorage |
| `app/(app)/layout.tsx` | Modify | Fetch `UserPreferences` from DB, render `<ThemeSync>` |
| `components/ui/action-toast.tsx` | Create | Reusable toast UI component |
| `app/(app)/settings/system/page.tsx` | Modify | Split `busy` → 3 states, use `<ActionToast>` |
| `app/(app)/settings/greenhouse/greenhouse-form.tsx` | Modify | Use `<ActionToast>` instead of inline `<p>` |
| `app/(app)/settings/financial/financial-form.tsx` | Modify | Use `<ActionToast>` instead of inline `<p>` |
| `app/(app)/settings/partners/partners-form.tsx` | Modify | Remove inline `Toast` fn, use `<ActionToast>` |

---

## Task 1: Anti-Flash Inline Script

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add inline script to `<head>` in `app/layout.tsx`**

Open `app/layout.tsx`. The current `<html>` element has no theme logic. Add a `<script>` tag as the first child of `<head>`. The script must run synchronously before any paint.

Replace the entire file with:

```tsx
import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "نظام إدارة صوبة الماشروم",
  description: "نظام متكامل لإدارة دورات إنتاج الماشروم والمالية والمخزون",
  applicationName: "صوبة الماشروم",
};

export const viewport: Viewport = {
  themeColor: "#1f7a4d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `app/layout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(theme): add anti-flash inline script to root layout"
```

---

## Task 2: ThemeSync Client Component

**Files:**
- Create: `components/theme-sync.tsx`

- [ ] **Step 1: Create `components/theme-sync.tsx`**

```tsx
"use client";

import { useEffect } from "react";

export function ThemeSync({ theme }: { theme: "light" | "dark" }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return null;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/theme-sync.tsx
git commit -m "feat(theme): add ThemeSync client component"
```

---

## Task 3: Wire ThemeSync Into App Layout

**Files:**
- Modify: `app/(app)/layout.tsx`

The app layout is already a Server Component that calls `auth()` and `getCustodyBalance()`. We add one more DB query for `UserPreferences`.

- [ ] **Step 1: Update `app/(app)/layout.tsx`**

Replace the entire file with:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ThemeSync } from "@/components/theme-sync";
import { getCustodyBalance } from "@/lib/custody";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  const [custodyBalance, prefs] = await Promise.all([
    getCustodyBalance(),
    prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: { theme: true },
    }),
  ]);

  const theme = (prefs?.theme === "dark" ? "dark" : "light") as "light" | "dark";

  return (
    <div className="flex min-h-screen">
      <ThemeSync theme={theme} />
      <Sidebar role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={session.user.name ?? session.user.email ?? ""}
          role={session.user.role}
          custodyBalance={custodyBalance}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/layout.tsx
git commit -m "feat(theme): read UserPreferences from DB and pass to ThemeSync"
```

---

## Task 4: Reusable ActionToast Component

**Files:**
- Create: `components/ui/action-toast.tsx`

- [ ] **Step 1: Create `components/ui/action-toast.tsx`**

```tsx
type ToastState = { msg: string; ok: boolean } | null;

export function ActionToast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        toast.ok
          ? "bg-green-500/10 text-green-600"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {toast.msg}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/action-toast.tsx
git commit -m "feat(ui): add ActionToast reusable component"
```

---

## Task 5: Per-Button Loading States + ActionToast in system/page.tsx

**Files:**
- Modify: `app/(app)/settings/system/page.tsx`

Currently: one shared `busy` state, inline `Toast` function.
After: three independent states (`csvBusy`, `excelBusy`, `printBusy`), uses `<ActionToast>`.

- [ ] **Step 1: Replace `app/(app)/settings/system/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionToast } from "@/components/ui/action-toast";
import { Settings, Sun, Moon, Download, Printer } from "lucide-react";
import { exportAllDataAction, exportExcelAction, getPrintDataAction, updateThemePreferenceAction } from "@/actions/settings";
import type { PrintData } from "@/actions/settings";

function buildPrintHtml(data: PrintData): string {
  function table(title: string, headers: string[], rows: string[][]): string {
    return `
      <h2>${title}</h2>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقرير بيانات الصوبة</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&display=swap');
    body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; font-size: 12px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: right; }
    th { background: #f0f0f0; font-weight: 600; }
    @media print { body { padding: 0; } h2 { page-break-before: auto; } }
  </style>
</head>
<body>
  <h1>تقرير بيانات الصوبة — ${new Date().toLocaleDateString("ar-EG")}</h1>
  ${table("المبيعات", ["التاريخ", "العميل", "الكراتين", "الإجمالي", "الدورة"], data.sales.map((s) => [s.date, s.customerName, String(s.cartons), String(s.total), String(s.cycle)]))}
  ${table("المصروفات", ["التاريخ", "الوصف", "المبلغ", "الدورة"], data.expenses.map((e) => [e.date, e.description, String(e.amount), String(e.cycle)]))}
  ${table("إيداعات العهدة", ["التاريخ", "المبلغ", "ملاحظات"], data.deposits.map((d) => [d.date, String(d.amount), d.notes]))}
  ${table("صرفيات العهدة", ["التاريخ", "الوصف", "المبلغ"], data.withdrawals.map((w) => [w.date, w.description, String(w.amount)]))}
  ${table("المخزن", ["الاسم", "الكمية الأولية", "الوحدة"], data.inventory.map((i) => [i.name, String(i.initialQty), i.unit]))}
</body>
</html>`;
}

export default function SystemPage() {
  const [dark, setDark] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    await updateThemePreferenceAction(next ? "dark" : "light");
  }

  async function handleExportCsv() {
    setCsvBusy(true);
    try {
      const result = await exportAllDataAction();
      if (!result.success) { showToast(result.error, false); return; }
      const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير CSV بنجاح", true);
    } finally {
      setCsvBusy(false);
    }
  }

  async function handleExportExcel() {
    setExcelBusy(true);
    try {
      const result = await exportExcelAction();
      if (!result.success) { showToast(result.error, false); return; }
      const bytes = Uint8Array.from(atob(result.base64!), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير Excel بنجاح", true);
    } finally {
      setExcelBusy(false);
    }
  }

  async function handlePrintPdf() {
    setPrintBusy(true);
    try {
      const result = await getPrintDataAction();
      if (!result.success) { showToast(result.error, false); return; }

      const printDiv = document.createElement("div");
      printDiv.id = "print-content";
      printDiv.innerHTML = buildPrintHtml(result.data!);

      const style = document.createElement("style");
      style.id = "print-hide-style";
      style.textContent = `@media print { body > *:not(#print-content) { display: none !important; } #print-content { display: block !important; } }`;

      document.body.appendChild(printDiv);
      document.head.appendChild(style);

      window.print();

      const cleanup = () => {
        document.getElementById("print-content")?.remove();
        document.getElementById("print-hide-style")?.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 5000);
    } finally {
      setPrintBusy(false);
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
              <Button variant="outline" disabled={csvBusy} onClick={handleExportCsv}>
                <Download className="me-2 h-4 w-4" />
                {csvBusy ? "جارٍ التصدير…" : "تصدير CSV"}
              </Button>
              <Button variant="outline" disabled={excelBusy} onClick={handleExportExcel}>
                <Download className="me-2 h-4 w-4" />
                {excelBusy ? "جارٍ التصدير…" : "تصدير Excel"}
              </Button>
              <Button variant="outline" disabled={printBusy} onClick={handlePrintPdf}>
                <Printer className="me-2 h-4 w-4" />
                {printBusy ? "جارٍ التحميل…" : "طباعة / PDF"}
              </Button>
            </div>
          </div>

          <ActionToast toast={toast} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/settings/system/page.tsx
git commit -m "feat(settings): split busy states, use ActionToast in system page"
```

---

## Task 6: ActionToast in greenhouse-form.tsx

**Files:**
- Modify: `app/(app)/settings/greenhouse/greenhouse-form.tsx`

Currently uses inline `<p>` tags for success/error. Replace with `<ActionToast>`.
Note: This form uses `useActionState` (React 19), which already provides `state` and `pending` — no hook changes needed, just replace the inline feedback UI.

- [ ] **Step 1: Update `app/(app)/settings/greenhouse/greenhouse-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionToast } from "@/components/ui/action-toast";
import { Leaf } from "lucide-react";
import { updateGreenhouseSettingsAction } from "@/actions/settings";

type Props = {
  defaults: { temperature: number; humidity: number; cycleDuration: number };
};

export function GreenhouseForm({ defaults }: Props) {
  const [state, action, pending] = useActionState(updateGreenhouseSettingsAction, undefined);

  const toast = state
    ? { msg: state.success ? "تم الحفظ بنجاح" : state.error, ok: state.success }
    : null;

  return (
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
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="temperature">درجة الحرارة المستهدفة (°م)</Label>
              <Input
                id="temperature"
                name="temperature"
                type="number"
                min={0}
                max={50}
                defaultValue={defaults.temperature}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="humidity">الرطوبة المستهدفة (%)</Label>
              <Input
                id="humidity"
                name="humidity"
                type="number"
                min={0}
                max={100}
                defaultValue={defaults.humidity}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycleDuration">مدة الدورة (يوم)</Label>
              <Input
                id="cycleDuration"
                name="cycleDuration"
                type="number"
                min={1}
                max={365}
                defaultValue={defaults.cycleDuration}
              />
            </div>
          </div>
          <ActionToast toast={toast} />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/settings/greenhouse/greenhouse-form.tsx
git commit -m "feat(settings): use ActionToast in greenhouse form"
```

---

## Task 7: ActionToast in financial-form.tsx

**Files:**
- Modify: `app/(app)/settings/financial/financial-form.tsx`

Same pattern as Task 6 — replace inline `<p>` feedback with `<ActionToast>`.

- [ ] **Step 1: Update `app/(app)/settings/financial/financial-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionToast } from "@/components/ui/action-toast";
import { DollarSign } from "lucide-react";
import { updateFinancialSettingsAction } from "@/actions/settings";

type Props = {
  defaults: { currency: string; taxRate: number };
};

export function FinancialForm({ defaults }: Props) {
  const [state, action, pending] = useActionState(updateFinancialSettingsAction, undefined);

  const toast = state
    ? { msg: state.success ? "تم الحفظ بنجاح" : state.error, ok: state.success }
    : null;

  return (
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
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currency">العملة الافتراضية</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={defaults.currency}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRate">نسبة الضريبة (%)</Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                defaultValue={defaults.taxRate}
              />
            </div>
          </div>
          <ActionToast toast={toast} />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/settings/financial/financial-form.tsx
git commit -m "feat(settings): use ActionToast in financial form"
```

---

## Task 8: ActionToast in partners-form.tsx

**Files:**
- Modify: `app/(app)/settings/partners/partners-form.tsx`

Currently has an inline `Toast` function and its own toast state. Remove the local `Toast` function, import `ActionToast` instead. Keep all other state/logic unchanged.

- [ ] **Step 1: Update `app/(app)/settings/partners/partners-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionToast } from "@/components/ui/action-toast";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { updatePartnersAction } from "@/actions/settings";

type Partner = { id: string; name: string; sharePercent: number };

export function PartnerSharesForm({ initialPartners }: { initialPartners: Partner[] }) {
  const [partners, setPartners] = useState<Partner[]>(
    initialPartners.length > 0
      ? initialPartners
      : [{ id: crypto.randomUUID(), name: "", sharePercent: 0 }],
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const total = partners.reduce((sum, p) => sum + (Number(p.sharePercent) || 0), 0);
  const overLimit = total > 100;

  function addPartner() {
    setPartners((prev) => [...prev, { id: crypto.randomUUID(), name: "", sharePercent: 0 }]);
  }

  function removePartner(id: string) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePartner(id: string, field: "name" | "sharePercent", value: string | number) {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function handleSave() {
    if (overLimit) return;
    setSaving(true);
    try {
      const result = await updatePartnersAction(
        partners.map((p, i) => ({ name: p.name, sharePercent: Number(p.sharePercent) || 0, position: i })),
      );
      setToast({ msg: result.success ? "تم حفظ توزيع الأرباح بنجاح" : result.error, ok: result.success });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_120px_40px] gap-3 px-1">
        <p className="text-xs font-medium text-muted-foreground">اسم الشريك</p>
        <p className="text-xs font-medium text-muted-foreground">النسبة (%)</p>
        <span />
      </div>

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
            value={partner.sharePercent}
            onChange={(e) => updatePartner(partner.id, "sharePercent", Number(e.target.value))}
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

      <Button type="button" variant="outline" size="sm" onClick={addPartner} className="gap-2">
        <Plus className="h-4 w-4" />
        إضافة شريك
      </Button>

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

      <ActionToast toast={toast} />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={overLimit || saving}>
          {saving ? "جارٍ الحفظ…" : "حفظ التوزيع"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/settings/partners/partners-form.tsx
git commit -m "feat(settings): use ActionToast in partners form"
```

---

## Task 9: Final Verification + Push

- [ ] **Step 1: Run full TypeScript check**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1
```

Expected: no errors (exit code 0).

- [ ] **Step 2: Verify all expected files exist**

```bash
ls components/theme-sync.tsx components/ui/action-toast.tsx
```

Expected: both files present.

- [ ] **Step 3: Verify git log shows all commits**

```bash
git log --oneline -10
```

Expected: see commits for Tasks 1–8 in order.

- [ ] **Step 4: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

Expected: push succeeds, Vercel deployment starts automatically.
