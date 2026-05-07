# Full UI Redesign — Light Elevated Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the entire app's visual quality to a "Light Elevated" style — white background, raised shadowed cards, green accent top-borders on KPI cards, dark glassmorphism login, and polished sidebar/topbar.

**Architecture:** All changes are pure Tailwind CSS class updates — no new components, no new dependencies. We patch CSS tokens in `globals.css`, update layout shell files (`sidebar.tsx`, `topbar.tsx`), then page-by-page (dashboard → login → table pages).

**Tech Stack:** Next.js 15, Tailwind CSS, shadcn/ui, tailwindcss-rtl (RTL logical properties)

---

## Files Modified

| File | What changes |
|------|-------------|
| `app/globals.css` | Add `--shadow-card`, `--shadow-card-hover`, `--radius-lg` tokens |
| `components/layout/sidebar.tsx` | New active style (accent bar), section label polish |
| `components/layout/topbar.tsx` | Shadow, custody pill, initials avatar |
| `app/(app)/dashboard/page.tsx` | KPI cards, progress bar, alerts, quick-add grid |
| `app/login/page.tsx` | Dark glassmorphism card on form panel |
| `app/(app)/sales/page.tsx` | Page header + table header + badge pill styles |
| `app/(app)/expenses/page.tsx` | Same pattern as sales |
| `app/(app)/inventory/page.tsx` | Same pattern as sales |
| `app/(app)/custody/page.tsx` | Same pattern as sales |
| `app/(app)/operations/page.tsx` | Same pattern as sales |

---

## Task 1: Add Design Tokens to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add shadow and radius tokens to `:root` and `.dark`**

Open `app/globals.css`. After the `--ring` line inside `:root {}`, add:

```css
    --shadow-card: 0 2px 12px rgba(0,0,0,0.07);
    --shadow-card-hover: 0 4px 20px rgba(0,0,0,0.12);
    --radius-lg: 1rem;
```

Inside `.dark {}`, after `--ring`:

```css
    --shadow-card: 0 2px 16px rgba(0,0,0,0.25);
    --shadow-card-hover: 0 4px 24px rgba(0,0,0,0.35);
    --radius-lg: 1rem;
```

- [ ] **Step 2: Add utility classes at the bottom of globals.css**

After the existing `@layer base` blocks, add:

```css
@layer utilities {
  .shadow-card { box-shadow: var(--shadow-card); }
  .shadow-card-hover { box-shadow: var(--shadow-card-hover); }
}
```

- [ ] **Step 3: Verify dev server compiles without errors**

Run: `npm run dev`
Expected: no TypeScript or CSS errors in terminal.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): add shadow-card and radius-lg tokens"
```

---

## Task 2: Redesign Sidebar

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Update the active nav item style**

Find the `active` class string in the `Link` className (around line 97-103). Replace:

```tsx
active
  ? "bg-primary text-primary-foreground"
  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
```

With:

```tsx
active
  ? "border-r-2 border-primary bg-primary/8 text-primary font-semibold"
  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
```

- [ ] **Step 2: Polish the section label**

Find the `<p>` tag rendering `section.label` (around line 83). Replace:

```tsx
<p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
  {section.label}
</p>
```

With:

```tsx
<p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
  {section.label}
</p>
```

- [ ] **Step 3: Polish the logo/brand area**

Find the logo `<div>` (around line 69-73). Replace:

```tsx
<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
  🍄
</span>
<span className="font-bold">صوبة الماشروم</span>
```

With:

```tsx
<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xl shadow-sm">
  🍄
</span>
<div>
  <span className="block font-bold leading-tight">صوبة الماشروم</span>
  <span className="block text-[10px] text-muted-foreground">نظام الإدارة</span>
</div>
```

- [ ] **Step 4: Check browser — sidebar should show accent bar on active item**

Open `http://localhost:3000/dashboard`. Active item must show right-side green bar, not green fill.

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(design): sidebar — accent bar active state, polished labels"
```

---

## Task 3: Redesign Topbar

**Files:**
- Modify: `components/layout/topbar.tsx`

- [ ] **Step 1: Replace the full topbar content**

Replace the entire file content with:

```tsx
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEGP } from "@/lib/format";
import { logoutAction } from "@/actions/auth";
import type { Role } from "@prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "مدير",
  OPERATOR: "مشغّل",
  ACCOUNTANT: "محاسب",
};

export function Topbar({
  userName,
  role,
  custodyBalance,
}: {
  userName: string;
  role: Role;
  custodyBalance: number;
}) {
  const low = custodyBalance < 1000;
  const initials = userName.trim().slice(0, 2) || "م";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-6 shadow-sm backdrop-blur">
      {/* Custody balance */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">رصيد العهدة:</span>
        <span
          className={`rounded-full border px-3 py-0.5 text-sm font-semibold tabular-nums ${
            low
              ? "border-warning/30 bg-warning/15 text-warning"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {formatEGP(custodyBalance)}
        </span>
      </div>

      {/* User info + logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="hidden text-sm sm:block">
            <span className="font-medium">{userName}</span>
            <span className="mr-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Check browser — topbar should show initials avatar and pill custody badge**

Verify at `http://localhost:3000/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add components/layout/topbar.tsx
git commit -m "feat(design): topbar — initials avatar, pill custody badge, shadow"
```

---

## Task 4: Redesign Dashboard KPI Cards & Progress Bar

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update KpiCard component**

Find the `KpiCard` function (around line 168). Replace the entire function:

```tsx
function KpiCard({
  label,
  value,
  sublabel,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent: "success" | "destructive" | "warning" | "default";
  icon?: React.ReactNode;
}) {
  const styles = {
    success: {
      bar: "border-t-success",
      iconBg: "bg-success/10 text-success",
      value: "text-success",
    },
    destructive: {
      bar: "border-t-destructive",
      iconBg: "bg-destructive/10 text-destructive",
      value: "text-destructive",
    },
    warning: {
      bar: "border-t-warning",
      iconBg: "bg-warning/10 text-warning",
      value: "text-warning",
    },
    default: {
      bar: "border-t-border",
      iconBg: "bg-muted text-muted-foreground",
      value: "text-foreground",
    },
  }[accent];

  return (
    <Card className={`shadow-card hover:shadow-card-hover border-t-2 transition-shadow ${styles.bar}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon && (
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.iconBg}`}>
              {icon}
            </span>
          )}
        </div>
        <p className={`mt-3 text-2xl font-bold tabular-nums ${styles.value}`}>{value}</p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update the cycle progress card**

Find the progress card block (around lines 60-73). Replace:

```tsx
      {/* Cycle progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>تقدّم الدورة</span>
            <span className="tabular-nums">{c.progressPct}٪</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${c.progressPct}%` }}
            />
          </div>
        </CardContent>
      </Card>
```

With:

```tsx
      {/* Cycle progress bar */}
      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">تقدّم الدورة</span>
            <div className="text-left">
              <span className="text-2xl font-bold tabular-nums text-primary">{c.progressPct}</span>
              <span className="text-sm text-muted-foreground">٪</span>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70 transition-all"
              style={{ width: `${c.progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>بداية</span>
            <span>منتصف</span>
            <span>نهاية</span>
          </div>
        </CardContent>
      </Card>
```

- [ ] **Step 3: Update alerts card**

Find the alerts map block (around lines 114-128). Replace each alert `Link` className:

```tsx
className={cn(
  "flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent",
  a.level === "destructive" && "border-destructive/30 bg-destructive/5",
  a.level === "warning" && "border-warning/40 bg-warning/5",
)}
```

With:

```tsx
className={cn(
  "flex items-center justify-between rounded-md border-r-4 border p-3 text-sm transition-all hover:bg-accent hover:translate-x-0.5",
  a.level === "destructive" && "border-r-destructive border-destructive/20 bg-destructive/5",
  a.level === "warning" && "border-r-warning border-warning/20 bg-warning/5",
)}
```

- [ ] **Step 4: Update Quick Add section**

Find the Quick Add `CardContent` (around lines 137-159). Replace its contents:

```tsx
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">إضافة سريعة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/expenses">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <TrendingDown className="h-5 w-5" />
              </span>
              <span className="text-xs">مصروف جديد</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/sales">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <TrendingUp className="h-5 w-5" />
              </span>
              <span className="text-xs">بيع جديد</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/custody">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <span className="text-xs">صرف عهدة</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/operations">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-xs">قراءة اليوم</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
```

- [ ] **Step 5: Check browser — dashboard should look significantly more polished**

Open `http://localhost:3000/dashboard`. Verify KPI cards have colored top borders and icon badges, progress bar has gradient and stage labels, quick-add is a 2×2 grid.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat(design): dashboard — elevated KPI cards, gradient progress, quick-add grid"
```

---

## Task 5: Redesign Login Page

**Files:**
- Modify: `app/login/page.tsx`

The login page already has a good left-panel design. We only update the **right form panel** to match MycoSystem Pro's glassmorphism style on mobile (where the hero is hidden).

- [ ] **Step 1: Update the form panel div**

Find the form panel div (around line 53):

```tsx
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-12 lg:w-[480px] lg:shrink-0">
```

Replace with:

```tsx
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-12 lg:w-[480px] lg:shrink-0 lg:bg-background">
```

No change needed — the hero panel already uses the dark green gradient. The form panel is fine as-is on desktop. The improvement is mobile: wrap the entire page in a gradient when there's no hero panel.

- [ ] **Step 2: Wrap the root div for mobile full-screen gradient**

Find the root div (line 10):

```tsx
    <div className="flex min-h-screen">
```

Replace with:

```tsx
    <div className="flex min-h-screen bg-gradient-to-br from-[hsl(150,55%,18%)] to-[hsl(150,55%,32%)] lg:bg-none">
```

- [ ] **Step 3: Add glassmorphism to form panel on mobile**

Find the form panel div and update:

```tsx
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-12 lg:w-[480px] lg:shrink-0">
```

Replace with:

```tsx
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[480px] lg:shrink-0 lg:bg-background">
        <div className="w-full max-w-sm rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-md lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
```

And close the new div before the closing `</div>` of the form panel. Add `</div>` before `</div>` at the end of the form panel content (before the outer closing `</div>`).

- [ ] **Step 4: Fix text colors for mobile glassmorphism**

On mobile (inside the glass card), headings and labels need to be white. Add to the inner wrapper div around the form:

```tsx
          <div className="mb-8 lg:hidden">
            <h2 className="text-2xl font-bold tracking-tight text-white">تسجيل الدخول</h2>
            <p className="mt-1 text-sm text-white/60">أدخل بياناتك للوصول إلى لوحة التحكم</p>
          </div>
          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight">تسجيل الدخول</h2>
            <p className="mt-1 text-sm text-muted-foreground">أدخل بياناتك للوصول إلى لوحة التحكم</p>
          </div>
```

Remove the original single heading block.

- [ ] **Step 5: Check browser at mobile width**

Open `http://localhost:3000/login` and resize to mobile. Should show dark green gradient with frosted glass form card. Desktop should look unchanged.

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat(design): login — mobile glassmorphism card on dark gradient"
```

---

## Task 6: Redesign Table Pages — Sales

**Files:**
- Modify: `app/(app)/sales/page.tsx`

- [ ] **Step 1: Update the page header**

Find the `<h1>` heading (around line 27). Replace:

```tsx
        <h1 className="text-2xl font-bold">المبيعات</h1>
```

With:

```tsx
        <h1 className="text-2xl font-bold">المبيعات</h1>
        <p className="text-sm text-muted-foreground">مبيعات الدورة الحالية</p>
```

And wrap both in a flex header with the add button. Find wherever the `SaleForm` button/trigger is rendered at the top and move it into a flex row with the title:

```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المبيعات</h1>
          <p className="text-sm text-muted-foreground">مبيعات الدورة الحالية</p>
        </div>
        {/* keep existing SaleForm trigger here */}
      </div>
```

- [ ] **Step 2: Update table header row styling**

Find the `<TableHeader>` or `<thead>` element. Add classes to the header row:

```tsx
<TableRow className="bg-muted/50 hover:bg-muted/50">
```

And update `<TableHead>` cells to add:

```tsx
className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
```

- [ ] **Step 3: Update table body row hover**

Find `<TableRow>` inside the body map. Add:

```tsx
className="hover:bg-accent/50 transition-colors"
```

- [ ] **Step 4: Check browser — sales table should have muted header and hover rows**

Open `http://localhost:3000/sales`.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/sales/page.tsx"
git commit -m "feat(design): sales — page header, table header muted, row hover"
```

---

## Task 7: Apply Table Pattern to Remaining Pages

Apply the same pattern from Task 6 to: `expenses/page.tsx`, `inventory/page.tsx`, `custody/page.tsx`, `operations/page.tsx`.

For each page:

**Files:**
- Modify: `app/(app)/expenses/page.tsx`
- Modify: `app/(app)/inventory/page.tsx`
- Modify: `app/(app)/custody/page.tsx`
- Modify: `app/(app)/operations/page.tsx`

- [ ] **Step 1: expenses/page.tsx — page header + table header + row hover**

Same changes as Task 6 Step 1-3 but with Arabic label "مصاريف التشغيل" and sublabel "مصاريف الدورة الحالية".

- [ ] **Step 2: inventory/page.tsx — page header + table header + row hover**

Arabic label "المخزن", sublabel "مخزون الدورة الحالية".

- [ ] **Step 3: custody/page.tsx — page header + table header + row hover**

Arabic label "العهدة", sublabel "حركات العهدة".

- [ ] **Step 4: operations/page.tsx — page header + table header + row hover**

Arabic label "جدول التشغيل", sublabel "القراءات اليومية للدورة".

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/expenses/page.tsx" "app/(app)/inventory/page.tsx" "app/(app)/custody/page.tsx" "app/(app)/operations/page.tsx"
git commit -m "feat(design): apply table polish to expenses, inventory, custody, operations"
```

---

## Task 8: Final QA & Deploy

- [ ] **Step 1: Check all pages in browser**

Visit in order: `/dashboard`, `/sales`, `/expenses`, `/inventory`, `/custody`, `/operations`, `/login` (mobile width). Verify no broken layouts or missing content.

- [ ] **Step 2: Check RTL direction is preserved**

All right-side borders should appear on the right (border-r = visual left in RTL). Active sidebar bar should appear on the inner edge (right side of nav item, adjacent to content).

- [ ] **Step 3: Check dark mode**

Toggle dark mode. Verify shadows are stronger but cards still readable.

- [ ] **Step 4: Push to GitHub**

```bash
git push origin master
```

Vercel auto-deploys on push.
