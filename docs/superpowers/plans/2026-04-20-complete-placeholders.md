# Complete Placeholders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge feat/edit-delete-row-actions → master, fix dual-ACTIVE-cycle bug, build analytics (4 recharts), real search, and settings hub — replacing all ComingSoon placeholders.

**Architecture:** Four independent deliverables executed sequentially. No new DB schema changes needed. Analytics adds one lib query function. Search is a server component with URL-param driven query. Settings becomes a nav hub + notifications toggle page.

**Tech Stack:** Next.js 15 App Router, Prisma/Postgres, Recharts, Shadcn/ui, server actions, `zod`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `actions/cycle.ts` | Modify | Guard: block `createCycleAction` if ACTIVE cycle exists |
| `lib/analytics.ts` | Create | `getAnalyticsData()` — queries PnL + avg env readings per cycle |
| `app/(app)/analytics/page.tsx` | Replace | Server component rendering 4 chart sections |
| `app/(app)/analytics/analytics-charts.tsx` | Create | Client charts: NetProfitChart, ExpensePieChart, CartonsChart, EnvChart |
| `app/(app)/search/page.tsx` | Replace | Server component: query-param search → grouped results |
| `app/(app)/settings/page.tsx` | Replace | Nav hub: cards → /settings/users + /settings/notifications |
| `app/(app)/settings/notifications/page.tsx` | Create | Web push toggle form (ADMIN only) |

---

## Task 1: Merge feat/edit-delete-row-actions into master

**Files:** (git only — no file edits)

- [ ] **Step 1: Switch to master and merge**

```bash
git checkout master
git merge feat/edit-delete-row-actions --no-edit
```

Expected: Fast-forward or merge commit. No conflicts (branches share a base).

- [ ] **Step 2: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Push**

```bash
git push origin master
```

---

## Task 2: Fix dual-ACTIVE-cycle guard in createCycleAction

**Files:**
- Modify: `actions/cycle.ts`

The `createCycleAction` currently sets `status: CycleStatus.ACTIVE` unconditionally. Add a guard that returns an error if any cycle with `status = ACTIVE` already exists.

- [ ] **Step 1: Add guard in `actions/cycle.ts`**

Find the block that starts with `const last = await prisma.cycle.findFirst(...)` and add the active-cycle check before it:

```typescript
// inside createCycleAction, after parsed.success check, before the `last` query:
const existingActive = await prisma.cycle.findFirst({
  where: { status: CycleStatus.ACTIVE },
  select: { number: true },
});
if (existingActive) {
  return {
    ok: false,
    error: `يوجد دورة نشطة بالفعل (دورة ${existingActive.number}) — أغلقها أولاً قبل إنشاء دورة جديدة`,
  };
}
```

The full updated function body (the try block only — keep everything else identical):

```typescript
export async function createCycleAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let created = false;
  try {
    const user = await requireRole(perms.cycleManage);

    const parsed = createCycleSchema.safeParse({
      startDate: formData.get("startDate"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: "بيانات غير صحيحة" };
    }

    const existingActive = await prisma.cycle.findFirst({
      where: { status: CycleStatus.ACTIVE },
      select: { number: true },
    });
    if (existingActive) {
      return {
        ok: false,
        error: `يوجد دورة نشطة بالفعل (دورة ${existingActive.number}) — أغلقها أولاً قبل إنشاء دورة جديدة`,
      };
    }

    const last = await prisma.cycle.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (last?.number ?? 0) + 1;

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "Cycle",
      entityId: (cycle: { id: string }) => cycle.id,
      mutate: (tx) =>
        tx.cycle.create({
          data: {
            number: nextNumber,
            startDate: parsed.data.startDate,
            endDate: computeCycleEnd(parsed.data.startDate),
            status: CycleStatus.ACTIVE,
            notes: parsed.data.notes ?? null,
          },
        }),
    });

    revalidatePath("/cycles");
    revalidatePath("/dashboard");
    created = true;
  } catch (err) {
    console.error("[createCycleAction] Error:", err);
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
  if (created) redirect("/cycles");
  return { ok: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add actions/cycle.ts
git commit -m "fix: block creating new cycle when one is already ACTIVE"
```

---

## Task 3: Analytics lib — getAnalyticsData()

**Files:**
- Create: `lib/analytics.ts`

This function returns everything the analytics page needs in one Promise.all call.

- [ ] **Step 1: Create `lib/analytics.ts`**

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAllCyclesPnL, type CyclePnL } from "@/lib/reports";

export type CycleEnvAvg = {
  cycleId: string;
  cycleNumber: number;
  avgTemp: number | null;
  avgHumidity: number | null;
};

export type AnalyticsData = {
  pnl: CyclePnL[];
  env: CycleEnvAvg[];
};

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const [pnl, cycles] = await Promise.all([
    getAllCyclesPnL(),
    prisma.cycle.findMany({
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        readings: {
          select: { temperature: true, humidity: true },
        },
      },
    }),
  ]);

  const env: CycleEnvAvg[] = cycles.map((c) => {
    const temps = c.readings
      .map((r) => (r.temperature ? Number(r.temperature) : null))
      .filter((v): v is number => v !== null);
    const humids = c.readings
      .map((r) => (r.humidity ? Number(r.humidity) : null))
      .filter((v): v is number => v !== null);

    return {
      cycleId: c.id,
      cycleNumber: c.number,
      avgTemp: temps.length > 0 ? Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)) : null,
      avgHumidity: humids.length > 0 ? Number((humids.reduce((a, b) => a + b, 0) / humids.length).toFixed(1)) : null,
    };
  });

  return { pnl, env };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 4: Analytics charts component

**Files:**
- Create: `app/(app)/analytics/analytics-charts.tsx`

Four charts, all client components. Follow exact same recharts pattern as `app/(app)/reports/reports-charts.tsx`.

- [ ] **Step 1: Create `app/(app)/analytics/analytics-charts.tsx`**

```typescript
"use client";

import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import type { CyclePnL } from "@/lib/reports";
import type { CycleEnvAvg } from "@/lib/analytics";

function egp(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Chart 1: Net profit per cycle (Line) ───────────────────────────────────

export function NetProfitChart({ cycles }: { cycles: CyclePnL[] }) {
  const data = cycles.map((c) => ({
    name: `د${c.cycleNumber}`,
    "صافي الربح": c.net,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => egp(v)} tick={{ fontSize: 11 }} width={90} />
        <Tooltip
          formatter={(v: number, name: string) => [egp(v), name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
        <Line
          type="monotone"
          dataKey="صافي الربح"
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Chart 2: Expense distribution across ALL cycles (Pie) ──────────────────

const PIE_COLORS = [
  "hsl(0 72% 51%)",
  "hsl(38 92% 50%)",
  "hsl(142 76% 36%)",
];

export function ExpenseDistributionChart({ cycles }: { cycles: CyclePnL[] }) {
  const totalExpenses = cycles.reduce((s, c) => s + c.expenses, 0);
  const totalCustody = cycles.reduce((s, c) => s + c.custody, 0);
  const totalNet = cycles.reduce((s, c) => s + Math.max(0, c.net), 0);

  const data = [
    { name: "مصاريف التشغيل", value: totalExpenses },
    { name: "مصاريف العهدة", value: totalCustody },
    { name: "صافي الربح", value: totalNet },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}٪`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, name: string) => [egp(v), name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Chart 3: Cartons sold per cycle (Bar) ──────────────────────────────────

export function CartonsChart({ cycles }: { cycles: CyclePnL[] }) {
  const data = cycles.map((c) => ({
    name: `د${c.cycleNumber}`,
    "كراتين": c.cartonsSold,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} width={60} />
        <Tooltip
          formatter={(v: number, name: string) => [v, name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
        <Bar dataKey="كراتين" fill="hsl(142 76% 36%)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Chart 4: Avg temperature + humidity per cycle (dual Line) ──────────────

export function EnvChart({ env }: { env: CycleEnvAvg[] }) {
  const data = env
    .filter((e) => e.avgTemp !== null || e.avgHumidity !== null)
    .map((e) => ({
      name: `د${e.cycleNumber}`,
      "الحرارة °C": e.avgTemp,
      "الرطوبة %": e.avgHumidity,
    }));

  if (data.length === 0) return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      لا توجد قراءات تشغيلية بعد.
    </p>
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} width={50} />
        <Tooltip contentStyle={{ direction: "rtl", textAlign: "right" }} />
        <Legend wrapperStyle={{ direction: "rtl" }} />
        <Line
          type="monotone"
          dataKey="الحرارة °C"
          stroke="hsl(0 72% 51%)"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="الرطوبة %"
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: Analytics page

**Files:**
- Replace: `app/(app)/analytics/page.tsx`

- [ ] **Step 1: Replace `app/(app)/analytics/page.tsx`**

```typescript
import { BarChart2, TrendingUp, Package, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsData } from "@/lib/analytics";
import {
  NetProfitChart,
  ExpenseDistributionChart,
  CartonsChart,
  EnvChart,
} from "./analytics-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { pnl, env } = await getAnalyticsData();

  const isEmpty = pnl.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">التحليل البياني</h1>
        <p className="text-sm text-muted-foreground">
          رسوم بيانية للإنتاج والمصاريف والأرباح ومؤشرات البيئة عبر الدورات
        </p>
      </div>

      {isEmpty ? (
        <p className="py-16 text-center text-muted-foreground">
          لا توجد دورات بعد. أنشئ دورة أولاً لعرض التحليلات.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                صافي الربح لكل دورة
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <NetProfitChart cycles={pnl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4" />
                توزيع المصاريف الإجمالي
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ExpenseDistributionChart cycles={pnl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                الكراتين المباعة لكل دورة
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <CartonsChart cycles={pnl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4" />
                متوسط الحرارة والرطوبة لكل دورة
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <EnvChart env={env} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit analytics**

```bash
git add lib/analytics.ts app/\(app\)/analytics/
git commit -m "feat: build analytics page with 4 recharts (profit, expenses, cartons, env)"
```

---

## Task 6: Search page

**Files:**
- Replace: `app/(app)/search/page.tsx`

Search is a server component. The user types a query → URL param `?q=...` → server queries 4 tables and returns grouped results.

- [ ] **Step 1: Replace `app/(app)/search/page.tsx`**

```typescript
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEGP, formatDate, formatInt } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const hasQuery = query.length >= 2;

  const [sales, expenses, withdrawals, inventory] = hasQuery
    ? await Promise.all([
        prisma.sale.findMany({
          where: { customerName: { contains: query, mode: "insensitive" } },
          orderBy: { date: "desc" },
          take: 20,
          select: {
            id: true,
            date: true,
            customerName: true,
            cartons: true,
            total: true,
            paid: true,
            cycle: { select: { number: true } },
          },
        }),
        prisma.expense.findMany({
          where: { description: { contains: query, mode: "insensitive" } },
          orderBy: { date: "desc" },
          take: 20,
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            cycle: { select: { number: true } },
          },
        }),
        prisma.custodyWithdrawal.findMany({
          where: { description: { contains: query, mode: "insensitive" } },
          orderBy: { date: "desc" },
          take: 20,
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            cycle: { select: { number: true } },
          },
        }),
        prisma.inventoryItem.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            name: true,
            unit: true,
            initialQty: true,
            createdAt: true,
            cycle: { select: { number: true } },
          },
        }),
      ])
    : [[], [], [], []];

  const totalResults = sales.length + expenses.length + withdrawals.length + inventory.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">البحث</h1>
        <p className="text-sm text-muted-foreground">
          بحث شامل في المبيعات والمصاريف والعهدة والمخزن
        </p>
      </div>

      {/* Search input */}
      <form method="GET" className="flex gap-2">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            placeholder="ابحث عن عميل، مصروف، صنف..."
            autoComplete="off"
            className="w-full rounded-md border bg-background py-2 pe-10 ps-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          بحث
        </button>
      </form>

      {/* Status */}
      {!hasQuery && (
        <p className="text-sm text-muted-foreground">
          أدخل حرفين على الأقل للبحث.
        </p>
      )}

      {hasQuery && totalResults === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          لا نتائج لـ &quot;{query}&quot;.
        </p>
      )}

      {/* Results */}
      {hasQuery && totalResults > 0 && (
        <p className="text-sm text-muted-foreground">
          {formatInt(totalResults)} نتيجة لـ &quot;{query}&quot;
        </p>
      )}

      {sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              المبيعات ({formatInt(sales.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">العميل</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">كراتين</th>
                    <th className="py-2 font-medium">الإجمالي</th>
                    <th className="py-2 font-medium">المدفوع</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 font-medium">{s.customerName}</td>
                      <td className="py-2 text-xs text-muted-foreground">{formatDate(s.date)}</td>
                      <td className="py-2">
                        <Badge variant="secondary">د{formatInt(s.cycle.number)}</Badge>
                      </td>
                      <td className="py-2 tabular-nums">{formatInt(s.cartons)}</td>
                      <td className="py-2 tabular-nums text-success">{formatEGP(Number(s.total))}</td>
                      <td className="py-2 tabular-nums">{formatEGP(Number(s.paid))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              المصاريف ({formatInt(expenses.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الوصف</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2">{e.description}</td>
                      <td className="py-2 text-xs text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="py-2">
                        <Badge variant="secondary">د{formatInt(e.cycle.number)}</Badge>
                      </td>
                      <td className="py-2 tabular-nums text-destructive">{formatEGP(Number(e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              صرفيات العهدة ({formatInt(withdrawals.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الوصف</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2">{w.description}</td>
                      <td className="py-2 text-xs text-muted-foreground">{formatDate(w.date)}</td>
                      <td className="py-2">
                        <Badge variant="secondary">د{formatInt(w.cycle.number)}</Badge>
                      </td>
                      <td className="py-2 tabular-nums text-warning">{formatEGP(Number(w.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {inventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              أصناف المخزن ({formatInt(inventory.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الصنف</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">الكمية الأولية</th>
                    <th className="py-2 font-medium">الوحدة</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 font-medium">{item.name}</td>
                      <td className="py-2">
                        <Badge variant="secondary">د{formatInt(item.cycle.number)}</Badge>
                      </td>
                      <td className="py-2 tabular-nums">{Number(item.initialQty)}</td>
                      <td className="py-2 text-muted-foreground">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit search**

```bash
git add app/\(app\)/search/page.tsx
git commit -m "feat: build real search page across sales, expenses, custody, inventory"
```

---

## Task 7: Settings hub page + notifications page

**Files:**
- Replace: `app/(app)/settings/page.tsx`
- Create: `app/(app)/settings/notifications/page.tsx`

The `/settings` page becomes a nav hub. `/settings/notifications` is a simple toggle page for Web Push (ADMIN only). Since Web Push subscription is per-device (handled client-side), the notifications page shows a description and a subscribe/unsubscribe button using existing browser Push API — no new server action needed beyond what already exists for PushSubscription.

- [ ] **Step 1: Replace `app/(app)/settings/page.tsx`**

```typescript
import Link from "next/link";
import { Users, Bell, ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/settings/users",
    icon: Users,
    title: "إدارة المستخدمين",
    description: "إضافة المستخدمين وتعديل أدوارهم وتفعيل/تعطيل حساباتهم.",
  },
  {
    href: "/settings/notifications",
    icon: Bell,
    title: "الإشعارات",
    description: "تفعيل أو تعطيل إشعارات المتصفح للتنبيهات المهمة.",
  },
];

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">
          إدارة المستخدمين والإشعارات وإعدادات النظام
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>{s.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(app)/settings/notifications/page.tsx`**

Check if there are existing push notification actions first:

```bash
grep -r "PushSubscription\|subscribe\|vapid" actions/ lib/ --include="*.ts" -l
```

Then create the page. The page shows notification status and a button to subscribe/unsubscribe using the browser Push API. The VAPID public key comes from `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var.

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationsToggle } from "./notifications-toggle";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الإشعارات</h1>
        <p className="text-sm text-muted-foreground">
          تفعيل إشعارات المتصفح لتلقي تنبيهات مهمة من النظام
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">إشعارات المتصفح</CardTitle>
            <CardDescription>تنبيهات فورية لرصيد العهدة المنخفض والأحداث المهمة</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <NotificationsToggle />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Check existing push subscription server action**

```bash
grep -r "subscribe\|PushSubscription" actions/ --include="*.ts" -n
```

If a `subscribePush` / `unsubscribePush` server action exists, use it. If not, create `actions/notifications.ts`:

```typescript
"use server";

import { prisma } from "@/lib/db";
import { requireRole, perms } from "@/lib/rbac";

export async function subscribePushAction(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const user = await requireRole(perms.cycleRead);
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { userId: user.id, ...subscription },
    update: { userId: user.id, p256dh: subscription.p256dh, auth: subscription.auth },
  });
}

export async function unsubscribePushAction(endpoint: string) {
  await requireRole(perms.cycleRead);
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}
```

- [ ] **Step 4: Create `app/(app)/settings/notifications/notifications-toggle.tsx`**

```typescript
"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribePushAction, unsubscribePushAction } from "@/actions/notifications";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function NotificationsToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    );
  }, []);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        المتصفح لا يدعم الإشعارات.
      </p>
    );
  }

  async function handleToggle() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await unsubscribePushAction(sub.endpoint);
        }
        setSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const json = sub.toJSON();
        await subscribePushAction({
          endpoint: json.endpoint!,
          p256dh: (json.keys as Record<string, string>).p256dh,
          auth: (json.keys as Record<string, string>).auth,
        });
        setSubscribed(true);
      }
    });
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {subscribed ? "الإشعارات مفعّلة على هذا الجهاز" : "الإشعارات معطّلة"}
      </p>
      <Button
        variant={subscribed ? "outline" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscribed ? (
          <>
            <BellOff className="me-2 h-4 w-4" />
            تعطيل
          </>
        ) : (
          <>
            <Bell className="me-2 h-4 w-4" />
            تفعيل
          </>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit settings**

```bash
git add app/\(app\)/settings/ actions/notifications.ts
git commit -m "feat: build settings hub and notifications toggle page"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Verify no ComingSoon imports remain in target pages**

```bash
grep -r "ComingSoon" app/\(app\)/analytics app/\(app\)/search app/\(app\)/settings/page.tsx
```

Expected: no output.

- [ ] **Step 3: Push to origin**

```bash
git push origin master
```
