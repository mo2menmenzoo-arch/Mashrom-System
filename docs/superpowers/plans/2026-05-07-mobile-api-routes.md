# Mobile API Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/api/mobile/` REST endpoints to the existing Next.js app on Vercel so the React Native mobile app can communicate with the backend.

**Architecture:** Each route lives under `app/api/mobile/`, verifies a JWT from the `Authorization: Bearer` header using a shared helper in `lib/mobile-auth.ts`, then calls the same `lib/` and `prisma` functions already used by Server Actions. No business logic is duplicated — routes are thin wrappers. The JWT is signed with the existing `AUTH_SECRET` env var.

**Tech Stack:** Next.js 15 App Router, `jose` (JWT), `bcryptjs`, Prisma, Zod (already installed)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/mobile-auth.ts` | **Create** | JWT sign/verify + `getMobileUser()` helper used by every route |
| `app/api/mobile/auth/login/route.ts` | **Create** | POST email+password → JWT |
| `app/api/mobile/auth/me/route.ts` | **Create** | GET current user info |
| `app/api/mobile/dashboard/route.ts` | **Create** | GET dashboard data |
| `app/api/mobile/cycles/route.ts` | **Create** | GET list + POST create |
| `app/api/mobile/cycles/[id]/route.ts` | **Create** | GET detail + PATCH close + DELETE |
| `app/api/mobile/expenses/route.ts` | **Create** | GET list + POST create |
| `app/api/mobile/expenses/[id]/route.ts` | **Create** | PATCH update + DELETE |
| `app/api/mobile/sales/route.ts` | **Create** | GET list + POST create |
| `app/api/mobile/sales/[id]/route.ts` | **Create** | PATCH update + DELETE |
| `app/api/mobile/sales/[id]/pay/route.ts` | **Create** | POST record payment |
| `app/api/mobile/operations/route.ts` | **Create** | GET list + POST create |
| `app/api/mobile/operations/[id]/route.ts` | **Create** | PATCH update + DELETE |
| `app/api/mobile/inventory/route.ts` | **Create** | GET list + POST add item |
| `app/api/mobile/inventory/[id]/route.ts` | **Create** | PATCH update + DELETE |
| `app/api/mobile/custody/route.ts` | **Create** | GET list + POST deposit/withdrawal |
| `app/api/mobile/custody/[id]/route.ts` | **Create** | PATCH update + DELETE |
| `app/api/mobile/reports/route.ts` | **Create** | GET P&L data |
| `app/api/mobile/analytics/route.ts` | **Create** | GET analytics chart data |
| `app/api/mobile/search/route.ts` | **Create** | GET global search |
| `app/api/mobile/settings/route.ts` | **Create** | GET + PATCH org settings |
| `app/api/mobile/greenhouses/route.ts` | **Create** | GET list + POST create |
| `app/api/mobile/greenhouses/[id]/route.ts` | **Create** | GET detail + PATCH update |
| `app/api/mobile/partners/route.ts` | **Create** | GET list + PUT replace all |
| `app/api/mobile/team/route.ts` | **Create** | GET users + POST create + PATCH permissions |

---

## Task 1: Install `jose` and create `lib/mobile-auth.ts`

**Files:**
- Modify: `package.json` (add `jose`)
- Create: `lib/mobile-auth.ts`

- [ ] **Step 1: Install jose**

```bash
npm install jose
```

Expected output: `added 1 package` (jose is a transitive dep so it may already be present — either way, run this to make it a direct dep).

- [ ] **Step 2: Create `lib/mobile-auth.ts`**

```typescript
// lib/mobile-auth.ts
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
const ALG = "HS256";
const EXPIRY = "7d";

export async function signMobileJwt(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export type MobileUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

export async function getMobileUser(request: Request): Promise<MobileUser> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
  const token = authHeader.slice(7);

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secret);
    userId = payload.sub!;
  } catch {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, active: true },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  return user;
}

export async function requireMobileRole(
  request: Request,
  allowed: Role[],
): Promise<MobileUser> {
  const user = await getMobileUser(request);
  if (!allowed.includes(user.role)) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
  return user;
}

/** Wraps a route handler with standard error responses. */
export function withMobileAuth(
  handler: (req: Request, user: MobileUser, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getMobileUser(req);
      return await handler(req, user, ctx);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 401) {
        return Response.json({ error: "غير مصرح" }, { status: 401 });
      }
      if (e.status === 403) {
        return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
      }
      console.error("[mobile-api]", e.message);
      return Response.json({ error: "خطأ في الخادم" }, { status: 500 });
    }
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```

Expected: no errors mentioning `mobile-auth.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/mobile-auth.ts package.json package-lock.json
git commit -m "feat(mobile-api): add JWT helper lib/mobile-auth.ts"
```

---

## Task 2: Auth routes — login + me

**Files:**
- Create: `app/api/mobile/auth/login/route.ts`
- Create: `app/api/mobile/auth/me/route.ts`

- [ ] **Step 1: Create login route**

```typescript
// app/api/mobile/auth/login/route.ts
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signMobileJwt } from "@/lib/mobile-auth";
import { getUserEffectivePerms } from "@/lib/rbac";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active || !user.password) {
      return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const token = await signMobileJwt(user.id);
    const perms = await getUserEffectivePerms(user.id);

    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        perms,
      },
    });
  } catch (err) {
    console.error("[mobile/auth/login]", err);
    return Response.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create me route**

```typescript
// app/api/mobile/auth/me/route.ts
import { getMobileUser, withMobileAuth } from "@/lib/mobile-auth";
import { getUserEffectivePerms } from "@/lib/rbac";

export const GET = withMobileAuth(async (_req, user) => {
  const perms = await getUserEffectivePerms(user.id);
  return Response.json({ user: { ...user, perms } });
});
```

- [ ] **Step 3: Test login with curl (run `npm run dev` first)**

```bash
curl -s -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@greenhouse.local","password":"ChangeMe!2026"}' | jq .
```

Expected: `{ "token": "eyJ...", "user": { "id": "...", "role": "ADMIN", "perms": {...} } }`

- [ ] **Step 4: Test me route with the token**

```bash
TOKEN="paste-token-from-above"
curl -s http://localhost:3000/api/mobile/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: `{ "user": { "id": "...", "role": "ADMIN", ... } }`

- [ ] **Step 5: Test unauthenticated request returns 401**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/mobile/auth/me
```

Expected: `401`

- [ ] **Step 6: Commit**

```bash
git add app/api/mobile/auth/
git commit -m "feat(mobile-api): add /auth/login and /auth/me endpoints"
```

---

## Task 3: Dashboard route

**Files:**
- Create: `app/api/mobile/dashboard/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/mobile/dashboard/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { getDashboardData } from "@/lib/dashboard";

export const GET = withMobileAuth(async () => {
  const data = await getDashboardData();
  return Response.json(data);
});
```

- [ ] **Step 2: Test**

```bash
curl -s http://localhost:3000/api/mobile/dashboard \
  -H "Authorization: Bearer $TOKEN" | jq .activeCycle.number
```

Expected: a number (e.g. `1`) or `null` if no active cycle.

- [ ] **Step 3: Commit**

```bash
git add app/api/mobile/dashboard/route.ts
git commit -m "feat(mobile-api): add /dashboard endpoint"
```

---

## Task 4: Cycles routes

**Files:**
- Create: `app/api/mobile/cycles/route.ts`
- Create: `app/api/mobile/cycles/[id]/route.ts`

- [ ] **Step 1: Create collection route**

```typescript
// app/api/mobile/cycles/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { computeCycleEnd } from "@/lib/cycle";
import { AuditAction, CycleStatus, Role } from "@prisma/client";

export const GET = withMobileAuth(async () => {
  const cycles = await prisma.cycle.findMany({
    orderBy: { startDate: "desc" },
    include: {
      greenhouse: { select: { name: true, number: true } },
      _count: { select: { sales: true, expenses: true, readings: true } },
    },
  });
  return Response.json(cycles);
});

const createSchema = z.object({
  startDate: z.coerce.date(),
  greenhouseId: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.cycleManage.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { startDate, greenhouseId, notes } = parsed.data;

  const existingActive = await prisma.cycle.findFirst({
    where: { status: CycleStatus.ACTIVE, greenhouseId },
    select: { number: true },
  });
  if (existingActive) {
    return Response.json(
      { error: `يوجد دورة نشطة بالفعل في هذه الصوبة (دورة ${existingActive.number}) — أغلقها أولاً` },
      { status: 409 },
    );
  }

  const last = await prisma.cycle.findFirst({
    where: { greenhouseId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = (last?.number ?? 0) + 1;

  const settings = await prisma.greenhouseSettings.findUnique({ where: { greenhouseId } });
  const cycleDuration = settings?.cycleDuration ?? 60;

  const cycle = await withAudit({
    userId: user.id,
    action: AuditAction.CREATE,
    entity: "Cycle",
    entityId: (c: { id: string }) => c.id,
    mutate: (tx) =>
      tx.cycle.create({
        data: {
          number: nextNumber,
          greenhouseId,
          startDate,
          endDate: computeCycleEnd(startDate, cycleDuration),
          status: CycleStatus.ACTIVE,
          notes: notes ?? null,
        },
      }),
  });

  return Response.json(cycle, { status: 201 });
});
```

- [ ] **Step 2: Create single-cycle route**

```typescript
// app/api/mobile/cycles/[id]/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, CycleStatus, Role } from "@prisma/client";
import { getCyclePnL } from "@/lib/reports";
import { cycleDayNumber, cycleProgress } from "@/lib/cycle";

export const GET = withMobileAuth(async (_req, _user, ctx) => {
  const { id } = await ctx!.params;
  const cycle = await prisma.cycle.findUnique({
    where: { id },
    include: { greenhouse: { select: { name: true, number: true } } },
  });
  if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });

  const pnl = await getCyclePnL(id);
  const dayNumber = cycleDayNumber(cycle.startDate);
  const progressPct = cycleProgress(cycle.startDate);

  return Response.json({ ...cycle, pnl, dayNumber, progressPct });
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.cycleManage.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;
  const { action } = await req.json();

  if (action === "close") {
    const cycle = await prisma.cycle.findUnique({ where: { id } });
    if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });
    if (cycle.status === CycleStatus.ENDED) {
      return Response.json({ error: "الدورة مغلقة بالفعل" }, { status: 409 });
    }

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Cycle",
      entityId: () => id,
      before: { status: cycle.status },
      mutate: (tx) =>
        tx.cycle.update({
          where: { id },
          data: { status: CycleStatus.ENDED, closedAt: new Date(), closedById: user.id },
        }),
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "إجراء غير معروف" }, { status: 400 });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.cycleManage.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const cycle = await prisma.cycle.findUnique({
    where: { id },
    include: {
      _count: {
        select: { sales: true, expenses: true, readings: true, deposits: true, withdrawals: true, inventory: true },
      },
    },
  });
  if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });

  const total = Object.values(cycle._count).reduce((s, n) => s + n, 0);
  if (total > 0) {
    return Response.json({ error: "لا يمكن حذف دورة تحتوي على بيانات" }, { status: 409 });
  }

  await prisma.cycle.delete({ where: { id } });
  return Response.json({ ok: true });
});
```

- [ ] **Step 3: Test**

```bash
curl -s http://localhost:3000/api/mobile/cycles \
  -H "Authorization: Bearer $TOKEN" | jq '.[0].status'
```

Expected: `"ACTIVE"` or `"ENDED"` (or empty array `[]`).

- [ ] **Step 4: Commit**

```bash
git add app/api/mobile/cycles/
git commit -m "feat(mobile-api): add /cycles endpoints (list, create, detail, close, delete)"
```

---

## Task 5: Expenses routes

**Files:**
- Create: `app/api/mobile/expenses/route.ts`
- Create: `app/api/mobile/expenses/[id]/route.ts`

- [ ] **Step 1: Create collection route**

```typescript
// app/api/mobile/expenses/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, InventorySource, InventoryTxnType, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");

  const expenses = await prisma.expense.findMany({
    where: cycleId ? { cycleId } : undefined,
    orderBy: { date: "desc" },
    include: { inventoryItem: { select: { id: true, name: true } } },
  });
  return Response.json(expenses);
});

const createSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
  isInventoryPurchase: z.boolean().optional(),
  inventoryName: z.string().trim().min(1).max(100).optional(),
  inventoryQty: z.coerce.number().positive().optional(),
  inventoryUnit: z.string().trim().min(1).max(20).optional(),
  inventoryExpiryDate: z.coerce.date().optional(),
  inventoryLowStockAt: z.coerce.number().positive().optional(),
});

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.expenseWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const { cycleId, date, description, amount, isInventoryPurchase,
    inventoryName, inventoryQty, inventoryUnit, inventoryExpiryDate, inventoryLowStockAt } = parsed.data;

  await assertCycleOpen(cycleId, { userRole: user.role as Role });

  const expense = await withAudit({
    userId: user.id,
    action: AuditAction.CREATE,
    entity: "Expense",
    entityId: (r: { id: string }) => r.id,
    mutate: async (tx) => {
      let inventoryItemId: string | undefined;

      if (isInventoryPurchase && inventoryName && inventoryQty) {
        const item = await tx.inventoryItem.create({
          data: {
            cycleId,
            name: inventoryName,
            initialQty: inventoryQty,
            unit: inventoryUnit ?? "وحدة",
            expiryDate: inventoryExpiryDate ?? null,
            lowStockAt: inventoryLowStockAt ?? null,
            source: InventorySource.DIRECT_PURCHASE,
          },
        });
        await tx.inventoryTxn.create({
          data: { itemId: item.id, type: InventoryTxnType.IN, qty: inventoryQty },
        });
        inventoryItemId = item.id;
      }

      return tx.expense.create({
        data: { cycleId, date, description, amount, createdById: user.id, inventoryItemId: inventoryItemId ?? null },
      });
    },
  });

  return Response.json(expense, { status: 201 });
});
```

- [ ] **Step 2: Create single-expense route**

```typescript
// app/api/mobile/expenses/[id]/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.expenseWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return Response.json({ error: "المصروف غير موجود" }, { status: 404 });

  await assertCycleOpen(expense.cycleId, { userRole: user.role as Role });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  await withAudit({
    userId: user.id,
    action: AuditAction.UPDATE,
    entity: "Expense",
    entityId: () => id,
    before: { description: expense.description, amount: expense.amount },
    mutate: (tx) =>
      tx.expense.update({ where: { id }, data: parsed.data }),
  });

  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (req, user, ctx) => {
  if (!perms.expenseWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;
  const { reason } = await req.json().catch(() => ({ reason: undefined }));

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return Response.json({ error: "المصروف غير موجود" }, { status: 404 });

  await assertCycleOpen(expense.cycleId, { userRole: user.role as Role, allowOverride: true, reason });

  await withAudit({
    userId: user.id,
    action: AuditAction.DELETE,
    entity: "Expense",
    entityId: () => id,
    before: { description: expense.description, amount: expense.amount },
    reason,
    mutate: async (tx) => {
      if (expense.inventoryItemId) {
        await tx.inventoryItem.delete({ where: { id: expense.inventoryItemId } });
      }
      return tx.expense.delete({ where: { id } });
    },
  });

  return Response.json({ ok: true });
});
```

- [ ] **Step 3: Test**

```bash
curl -s "http://localhost:3000/api/mobile/expenses" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'
```

Expected: a number ≥ 0.

- [ ] **Step 4: Commit**

```bash
git add app/api/mobile/expenses/
git commit -m "feat(mobile-api): add /expenses endpoints"
```

---

## Task 6: Sales routes

**Files:**
- Create: `app/api/mobile/sales/route.ts`
- Create: `app/api/mobile/sales/[id]/route.ts`
- Create: `app/api/mobile/sales/[id]/pay/route.ts`

- [ ] **Step 1: Create collection route**

```typescript
// app/api/mobile/sales/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, InventoryTxnType, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");

  const sales = await prisma.sale.findMany({
    where: cycleId ? { cycleId } : undefined,
    orderBy: { date: "desc" },
  });
  return Response.json(sales);
});

const createSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  customerName: z.string().trim().min(1).max(100),
  cartons: z.coerce.number().int().positive(),
  pricePerCarton: z.coerce.number().positive(),
  paid: z.coerce.number().min(0).default(0),
  inventoryItemId: z.string().optional(),
});

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.salesWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { cycleId, date, customerName, cartons, pricePerCarton, paid, inventoryItemId } = parsed.data;
  const total = Number((cartons * pricePerCarton).toFixed(2));

  if (paid > total) {
    return Response.json({ error: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" }, { status: 400 });
  }

  await assertCycleOpen(cycleId, { userRole: user.role as Role });

  const sale = await withAudit({
    userId: user.id,
    action: AuditAction.CREATE,
    entity: "Sale",
    entityId: (r: { id: string }) => r.id,
    mutate: async (tx) => {
      const s = await tx.sale.create({
        data: { cycleId, date, customerName, cartons, pricePerCarton, total, paid, inventoryItemId: inventoryItemId ?? null },
      });
      if (inventoryItemId) {
        await tx.inventoryTxn.create({
          data: { itemId: inventoryItemId, type: InventoryTxnType.OUT, qty: -cartons, saleId: s.id },
        });
      }
      return s;
    },
  });

  return Response.json(sale, { status: 201 });
});
```

- [ ] **Step 2: Create single-sale route**

```typescript
// app/api/mobile/sales/[id]/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({
  date: z.coerce.date(),
  customerName: z.string().trim().min(1).max(100),
  cartons: z.coerce.number().int().positive(),
  pricePerCarton: z.coerce.number().positive(),
  paid: z.coerce.number().min(0),
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.salesWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return Response.json({ error: "البيع غير موجود" }, { status: 404 });

  await assertCycleOpen(sale.cycleId, { userRole: user.role as Role });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { date, customerName, cartons, pricePerCarton, paid } = parsed.data;
  const total = Number((cartons * pricePerCarton).toFixed(2));
  if (paid > total) return Response.json({ error: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" }, { status: 400 });

  await withAudit({
    userId: user.id,
    action: AuditAction.UPDATE,
    entity: "Sale",
    entityId: () => id,
    before: { cartons: sale.cartons, pricePerCarton: sale.pricePerCarton, paid: sale.paid },
    mutate: async (tx) => {
      if (sale.inventoryItemId && cartons !== sale.cartons) {
        await tx.inventoryTxn.updateMany({ where: { saleId: id }, data: { qty: -cartons } });
      }
      return tx.sale.update({ where: { id }, data: { date, customerName, cartons, pricePerCarton, total, paid } });
    },
  });

  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.salesWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return Response.json({ error: "البيع غير موجود" }, { status: 404 });

  await assertCycleOpen(sale.cycleId, { userRole: user.role as Role });

  await withAudit({
    userId: user.id,
    action: AuditAction.DELETE,
    entity: "Sale",
    entityId: () => id,
    before: { customerName: sale.customerName, total: sale.total },
    mutate: async (tx) => {
      await tx.inventoryTxn.deleteMany({ where: { saleId: id } });
      return tx.sale.delete({ where: { id } });
    },
  });

  return Response.json({ ok: true });
});
```

- [ ] **Step 3: Create payment route**

```typescript
// app/api/mobile/sales/[id]/pay/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const schema = z.object({ additionalPaid: z.coerce.number().positive() });

export const POST = withMobileAuth(async (req, user, ctx) => {
  if (!perms.salesWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return Response.json({ error: "البيع غير موجود" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const newPaid = Number((Number(sale.paid) + parsed.data.additionalPaid).toFixed(2));
  if (newPaid > Number(sale.total)) {
    return Response.json({ error: "المبلغ المدفوع يتجاوز إجمالي الفاتورة" }, { status: 400 });
  }

  await assertCycleOpen(sale.cycleId, { userRole: user.role as Role });

  await withAudit({
    userId: user.id,
    action: AuditAction.UPDATE,
    entity: "Sale",
    entityId: () => id,
    before: { paid: sale.paid },
    mutate: (tx) => tx.sale.update({ where: { id }, data: { paid: newPaid } }),
  });

  return Response.json({ ok: true, newPaid });
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/mobile/sales/
git commit -m "feat(mobile-api): add /sales endpoints (list, create, update, delete, pay)"
```

---

## Task 7: Operations routes

**Files:**
- Create: `app/api/mobile/operations/route.ts`
- Create: `app/api/mobile/operations/[id]/route.ts`

- [ ] **Step 1: Create collection route**

```typescript
// app/api/mobile/operations/route.ts
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

  const readings = await prisma.operationReading.findMany({
    where: cycleId ? { cycleId } : undefined,
    orderBy: { date: "desc" },
  });
  return Response.json(readings);
});

const createSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  temperature: z.coerce.number().min(-50).max(100).optional(),
  humidity: z.coerce.number().min(0).max(100).optional(),
  co2: z.coerce.number().int().min(0).max(9999).optional(),
  cleanliness: z.enum(["EXCELLENT", "GOOD", "ACCEPTABLE", "POOR"]).optional(),
  notes: z.string().trim().max(500).optional(),
  watered: z.boolean().optional(),
  medicines: z.array(z.enum(MEDICINE_OPTIONS)).optional(),
});

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.operationsWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { cycleId, date, temperature, humidity, co2, cleanliness, notes, watered, medicines } = parsed.data;

  await assertCycleOpen(cycleId, { userRole: user.role as Role });

  const existing = await prisma.operationReading.findUnique({
    where: { cycleId_date: { cycleId, date } },
  });
  if (existing) return Response.json({ error: "تم تسجيل قراءة لهذا اليوم بالفعل" }, { status: 409 });

  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId }, select: { startDate: true } });
  if (!cycle) return Response.json({ error: "الدورة غير موجودة" }, { status: 404 });

  const dayNumber = cycleDayNumber(cycle.startDate, date);

  const reading = await withAudit({
    userId: user.id,
    action: AuditAction.CREATE,
    entity: "OperationReading",
    entityId: (r: { id: string }) => r.id,
    mutate: (tx) =>
      tx.operationReading.create({
        data: {
          cycleId, date, dayNumber,
          temperature: temperature ?? null,
          humidity: humidity ?? null,
          co2: co2 ?? null,
          cleanliness: cleanliness ?? null,
          notes: notes ?? null,
          watered: watered ?? false,
          medicines: medicines ?? [],
        },
      }),
  });

  return Response.json(reading, { status: 201 });
});
```

- [ ] **Step 2: Create single-reading route**

```typescript
// app/api/mobile/operations/[id]/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";
import { MEDICINE_OPTIONS } from "@/lib/medicines";

const updateSchema = z.object({
  temperature: z.coerce.number().min(-50).max(100).optional(),
  humidity: z.coerce.number().min(0).max(100).optional(),
  co2: z.coerce.number().int().min(0).max(9999).optional(),
  cleanliness: z.enum(["EXCELLENT", "GOOD", "ACCEPTABLE", "POOR"]).optional(),
  notes: z.string().trim().max(500).optional(),
  watered: z.boolean().optional(),
  medicines: z.array(z.enum(MEDICINE_OPTIONS)).optional(),
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.operationsWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const reading = await prisma.operationReading.findUnique({ where: { id } });
  if (!reading) return Response.json({ error: "القراءة غير موجودة" }, { status: 404 });

  await assertCycleOpen(reading.cycleId, { userRole: user.role as Role });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  await withAudit({
    userId: user.id,
    action: AuditAction.UPDATE,
    entity: "OperationReading",
    entityId: () => id,
    before: { temperature: reading.temperature, humidity: reading.humidity },
    mutate: (tx) =>
      tx.operationReading.update({
        where: { id },
        data: {
          temperature: parsed.data.temperature ?? null,
          humidity: parsed.data.humidity ?? null,
          co2: parsed.data.co2 ?? null,
          cleanliness: parsed.data.cleanliness ?? null,
          notes: parsed.data.notes ?? null,
          watered: parsed.data.watered ?? false,
          medicines: parsed.data.medicines ?? [],
        },
      }),
  });

  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.operationsWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const reading = await prisma.operationReading.findUnique({ where: { id } });
  if (!reading) return Response.json({ error: "القراءة غير موجودة" }, { status: 404 });

  await assertCycleOpen(reading.cycleId, { userRole: user.role as Role });

  await withAudit({
    userId: user.id,
    action: AuditAction.DELETE,
    entity: "OperationReading",
    entityId: () => id,
    before: { date: reading.date },
    mutate: (tx) => tx.operationReading.delete({ where: { id } }),
  });

  return Response.json({ ok: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/mobile/operations/
git commit -m "feat(mobile-api): add /operations endpoints"
```

---

## Task 8: Inventory routes

**Files:**
- Create: `app/api/mobile/inventory/route.ts`
- Create: `app/api/mobile/inventory/[id]/route.ts`

- [ ] **Step 1: Create collection route**

```typescript
// app/api/mobile/inventory/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCycleBalances } from "@/lib/inventory";
import { AuditAction, InventorySource, InventoryTxnType, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");

  const items = await prisma.inventoryItem.findMany({
    where: cycleId ? { cycleId } : undefined,
    orderBy: { name: "asc" },
  });

  if (cycleId) {
    const balances = await getCycleBalances(cycleId);
    return Response.json(
      items.map((item) => ({ ...item, balance: Number(balances.get(item.id) ?? 0) })),
    );
  }

  return Response.json(items);
});

const createSchema = z.object({
  cycleId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  initialQty: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(20).default("وحدة"),
  expiryDate: z.coerce.date().optional(),
  lowStockAt: z.coerce.number().positive().optional(),
});

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.inventoryWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { cycleId, name, initialQty, unit, expiryDate, lowStockAt } = parsed.data;
  await assertCycleOpen(cycleId, { userRole: user.role as Role });

  const item = await withAudit({
    userId: user.id,
    action: AuditAction.CREATE,
    entity: "InventoryItem",
    entityId: (r: { id: string }) => r.id,
    mutate: async (tx) => {
      const i = await tx.inventoryItem.create({
        data: { cycleId, name, initialQty, unit, expiryDate: expiryDate ?? null, lowStockAt: lowStockAt ?? null, source: InventorySource.DIRECT_PURCHASE },
      });
      await tx.inventoryTxn.create({ data: { itemId: i.id, type: InventoryTxnType.IN, qty: initialQty } });
      return i;
    },
  });

  return Response.json(item, { status: 201 });
});
```

- [ ] **Step 2: Create single-item route**

```typescript
// app/api/mobile/inventory/[id]/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  lowStockAt: z.coerce.number().positive().nullable().optional(),
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.inventoryWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "الصنف غير موجود" }, { status: 404 });

  await assertCycleOpen(item.cycleId, { userRole: user.role as Role });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  await withAudit({
    userId: user.id,
    action: AuditAction.UPDATE,
    entity: "InventoryItem",
    entityId: () => id,
    before: { name: item.name },
    mutate: (tx) => tx.inventoryItem.update({ where: { id }, data: parsed.data }),
  });

  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (_req, user, ctx) => {
  if (!perms.inventoryWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "الصنف غير موجود" }, { status: 404 });

  await assertCycleOpen(item.cycleId, { userRole: user.role as Role });

  await withAudit({
    userId: user.id,
    action: AuditAction.DELETE,
    entity: "InventoryItem",
    entityId: () => id,
    before: { name: item.name },
    mutate: async (tx) => {
      await tx.inventoryTxn.deleteMany({ where: { itemId: id } });
      return tx.inventoryItem.delete({ where: { id } });
    },
  });

  return Response.json({ ok: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/mobile/inventory/
git commit -m "feat(mobile-api): add /inventory endpoints"
```

---

## Task 9: Custody routes

**Files:**
- Create: `app/api/mobile/custody/route.ts`
- Create: `app/api/mobile/custody/[id]/route.ts`

- [ ] **Step 1: Create collection route**

```typescript
// app/api/mobile/custody/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCustodyBalance } from "@/lib/custody";
import { AuditAction, Role } from "@prisma/client";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");

  const [deposits, withdrawals, balance] = await Promise.all([
    prisma.custodyDeposit.findMany({
      where: cycleId ? { cycleId } : undefined,
      orderBy: { date: "desc" },
    }),
    prisma.custodyWithdrawal.findMany({
      where: cycleId ? { cycleId } : undefined,
      orderBy: { date: "desc" },
    }),
    getCustodyBalance(),
  ]);

  return Response.json({ deposits, withdrawals, balance });
});

const depositSchema = z.object({
  type: z.literal("deposit"),
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(200).optional(),
});

const withdrawalSchema = z.object({
  type: z.literal("withdrawal"),
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
  category: z.enum(["OPERATING", "FOUNDING"]).default("OPERATING"),
  greenhouseId: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("type", [depositSchema, withdrawalSchema]);

export const POST = withMobileAuth(async (req, user) => {
  if (!perms.custodyWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  await assertCycleOpen(parsed.data.cycleId, { userRole: user.role as Role });

  if (parsed.data.type === "deposit") {
    const { cycleId, date, amount, notes } = parsed.data;
    const record = await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "CustodyDeposit",
      entityId: (r: { id: string }) => r.id,
      mutate: (tx) => tx.custodyDeposit.create({ data: { cycleId, date, amount, notes: notes ?? null } }),
    });
    return Response.json(record, { status: 201 });
  }

  // withdrawal
  const { cycleId, date, description, amount, category, greenhouseId } = parsed.data;
  const balance = await getCustodyBalance();
  if (amount > balance) {
    return Response.json(
      { error: `رصيد العهدة غير كافٍ. الرصيد الحالي: ${balance.toFixed(2)} ج.م` },
      { status: 400 },
    );
  }

  const record = await withAudit({
    userId: user.id,
    action: AuditAction.CREATE,
    entity: "CustodyWithdrawal",
    entityId: (r: { id: string }) => r.id,
    mutate: async (tx) => {
      if (category === "OPERATING") {
        const expense = await tx.expense.create({
          data: { cycleId, date, description, amount, createdById: user.id },
        });
        return tx.custodyWithdrawal.create({
          data: { cycleId, date, description, amount, category, expenseId: expense.id },
        });
      }
      const fe = await tx.foundingExpense.create({ data: { greenhouseId, date, description, amount } });
      return tx.custodyWithdrawal.create({
        data: { cycleId, date, description, amount, category, foundingExpenseId: fe.id },
      });
    },
  });

  return Response.json(record, { status: 201 });
});
```

- [ ] **Step 2: Create single-record route**

```typescript
// app/api/mobile/custody/[id]/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCustodyBalance } from "@/lib/custody";
import { AuditAction, Role } from "@prisma/client";

const updateSchema = z.object({
  recordType: z.enum(["deposit", "withdrawal"]),
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(200).optional(),
  description: z.string().trim().min(1).max(200).optional(),
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (!perms.custodyWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  if (parsed.data.recordType === "deposit") {
    const deposit = await prisma.custodyDeposit.findUnique({ where: { id } });
    if (!deposit) return Response.json({ error: "الإيداع غير موجود" }, { status: 404 });
    await assertCycleOpen(deposit.cycleId, { userRole: user.role as Role });
    await withAudit({
      userId: user.id, action: AuditAction.UPDATE, entity: "CustodyDeposit", entityId: () => id,
      before: { amount: deposit.amount },
      mutate: (tx) => tx.custodyDeposit.update({ where: { id }, data: { date: parsed.data.date, amount: parsed.data.amount, notes: parsed.data.notes ?? null } }),
    });
  } else {
    const withdrawal = await prisma.custodyWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) return Response.json({ error: "الصرفية غير موجودة" }, { status: 404 });
    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role as Role });
    const balanceWithout = (await getCustodyBalance()) + Number(withdrawal.amount);
    if (parsed.data.amount > balanceWithout) {
      return Response.json({ error: `المبلغ يتجاوز رصيد العهدة. الحد الأقصى: ${balanceWithout.toFixed(2)} ج.م` }, { status: 400 });
    }
    await withAudit({
      userId: user.id, action: AuditAction.UPDATE, entity: "CustodyWithdrawal", entityId: () => id,
      before: { amount: withdrawal.amount },
      mutate: (tx) => tx.custodyWithdrawal.update({ where: { id }, data: { date: parsed.data.date, amount: parsed.data.amount, description: parsed.data.description ?? withdrawal.description } }),
    });
  }

  return Response.json({ ok: true });
});

export const DELETE = withMobileAuth(async (req, user, ctx) => {
  if (!perms.custodyWrite.includes(user.role as Role)) {
    return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  }
  const { id } = await ctx!.params;
  const { recordType } = await req.json().catch(() => ({ recordType: "deposit" }));

  if (recordType === "deposit") {
    const deposit = await prisma.custodyDeposit.findUnique({ where: { id } });
    if (!deposit) return Response.json({ error: "الإيداع غير موجود" }, { status: 404 });
    await assertCycleOpen(deposit.cycleId, { userRole: user.role as Role });
    await withAudit({
      userId: user.id, action: AuditAction.DELETE, entity: "CustodyDeposit", entityId: () => id,
      before: { amount: deposit.amount },
      mutate: (tx) => tx.custodyDeposit.delete({ where: { id } }),
    });
  } else {
    const withdrawal = await prisma.custodyWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) return Response.json({ error: "الصرفية غير موجودة" }, { status: 404 });
    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role as Role });
    await withAudit({
      userId: user.id, action: AuditAction.DELETE, entity: "CustodyWithdrawal", entityId: () => id,
      before: { amount: withdrawal.amount },
      mutate: async (tx) => {
        if (withdrawal.expenseId) await tx.expense.delete({ where: { id: withdrawal.expenseId } });
        if (withdrawal.foundingExpenseId) await tx.foundingExpense.delete({ where: { id: withdrawal.foundingExpenseId } });
        return tx.custodyWithdrawal.delete({ where: { id } });
      },
    });
  }

  return Response.json({ ok: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/mobile/custody/
git commit -m "feat(mobile-api): add /custody endpoints"
```

---

## Task 10: Reports, Analytics, Search, Settings, Greenhouses, Partners, Team

**Files:** 7 files (all straightforward wrappers around existing lib functions)

- [ ] **Step 1: Reports route**

```typescript
// app/api/mobile/reports/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { getAllCyclesPnL, getAllGreenhousesPnL } from "@/lib/reports";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "cycles";
  const greenhouseId = searchParams.get("greenhouseId") ?? undefined;

  if (view === "greenhouses") {
    const data = await getAllGreenhousesPnL();
    return Response.json(data);
  }

  const data = await getAllCyclesPnL(greenhouseId);
  return Response.json(data);
});
```

- [ ] **Step 2: Analytics route**

```typescript
// app/api/mobile/analytics/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { getAnalyticsData } from "@/lib/analytics";

export const GET = withMobileAuth(async () => {
  const data = await getAnalyticsData();
  return Response.json(data);
});
```

- [ ] **Step 3: Search route**

```typescript
// app/api/mobile/search/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return Response.json({ sales: [], expenses: [], withdrawals: [], inventory: [] });

  const [sales, expenses, withdrawals, inventory] = await Promise.all([
    prisma.sale.findMany({
      where: { customerName: { contains: q, mode: "insensitive" } },
      orderBy: { date: "desc" }, take: 20,
      select: { id: true, date: true, customerName: true, cartons: true, total: true, paid: true, cycle: { select: { number: true } } },
    }),
    prisma.expense.findMany({
      where: { description: { contains: q, mode: "insensitive" } },
      orderBy: { date: "desc" }, take: 20,
      select: { id: true, date: true, description: true, amount: true, cycle: { select: { number: true } } },
    }),
    prisma.custodyWithdrawal.findMany({
      where: { description: { contains: q, mode: "insensitive" } },
      orderBy: { date: "desc" }, take: 20,
      select: { id: true, date: true, description: true, amount: true, cycle: { select: { number: true } } },
    }),
    prisma.inventoryItem.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, name: true, unit: true, initialQty: true, createdAt: true, cycle: { select: { number: true } } },
    }),
  ]);

  return Response.json({ sales, expenses, withdrawals, inventory });
});
```

- [ ] **Step 4: Settings route**

```typescript
// app/api/mobile/settings/route.ts
import { z } from "zod";
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const DEFAULT_ORG_ID = "default-org";

export const GET = withMobileAuth(async (_req, user) => {
  const [fin, partners, prefs] = await Promise.all([
    prisma.financialSettings.findUnique({ where: { organizationId: DEFAULT_ORG_ID } }),
    prisma.partner.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { position: "asc" } }),
    prisma.userPreferences.findUnique({ where: { userId: user.id } }),
  ]);

  return Response.json({
    financial: { currency: fin?.currency ?? "EGP", taxRate: fin?.taxRate ?? 0 },
    partners: partners.map((p) => ({ id: p.id, name: p.name, sharePercent: p.sharePercent, position: p.position })),
    theme: prefs?.theme ?? "light",
  });
});

const patchSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  financial: z.object({ currency: z.enum(["EGP", "USD"]), taxRate: z.number().min(0).max(100) }).optional(),
});

export const PATCH = withMobileAuth(async (req, user) => {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  if (parsed.data.theme) {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, theme: parsed.data.theme },
      update: { theme: parsed.data.theme },
    });
  }

  if (parsed.data.financial) {
    if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
    await prisma.financialSettings.upsert({
      where: { organizationId: DEFAULT_ORG_ID },
      create: { organizationId: DEFAULT_ORG_ID, ...parsed.data.financial },
      update: parsed.data.financial,
    });
  }

  return Response.json({ ok: true });
});
```

- [ ] **Step 5: Greenhouses routes**

```typescript
// app/api/mobile/greenhouses/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { z } from "zod";

export const GET = withMobileAuth(async () => {
  const greenhouses = await prisma.greenhouse.findMany({
    orderBy: { number: "asc" },
    include: { settings: true, _count: { select: { cycles: true } } },
  });
  return Response.json(greenhouses);
});

const createSchema = z.object({ name: z.string().trim().min(1).max(100) });

export const POST = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const last = await prisma.greenhouse.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const nextNumber = (last?.number ?? 0) + 1;

  const gh = await prisma.greenhouse.create({
    data: { name: parsed.data.name, number: nextNumber, organizationId: "default-org" },
  });
  return Response.json(gh, { status: 201 });
});
```

```typescript
// app/api/mobile/greenhouses/[id]/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { z } from "zod";

export const GET = withMobileAuth(async (_req, _user, ctx) => {
  const { id } = await ctx!.params;
  const gh = await prisma.greenhouse.findUnique({
    where: { id },
    include: { settings: true, foundingExpenses: true, cycles: { orderBy: { number: "desc" }, take: 5 } },
  });
  if (!gh) return Response.json({ error: "الصوبة غير موجودة" }, { status: 404 });
  return Response.json(gh);
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  cycleDuration: z.coerce.number().int().min(1).optional(),
});

export const PATCH = withMobileAuth(async (req, user, ctx) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });
  const { id } = await ctx!.params;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  if (parsed.data.name) {
    await prisma.greenhouse.update({ where: { id }, data: { name: parsed.data.name } });
  }
  if (parsed.data.cycleDuration) {
    await prisma.greenhouseSettings.upsert({
      where: { greenhouseId: id },
      create: { greenhouseId: id, cycleDuration: parsed.data.cycleDuration },
      update: { cycleDuration: parsed.data.cycleDuration },
    });
  }

  return Response.json({ ok: true });
});
```

- [ ] **Step 6: Partners route**

```typescript
// app/api/mobile/partners/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { z } from "zod";

const DEFAULT_ORG_ID = "default-org";

export const GET = withMobileAuth(async () => {
  const partners = await prisma.partner.findMany({
    where: { organizationId: DEFAULT_ORG_ID },
    orderBy: { position: "asc" },
  });
  return Response.json(partners);
});

const putSchema = z.array(z.object({
  name: z.string().trim().min(1),
  sharePercent: z.number().min(0).max(100),
  position: z.number().int().min(0),
}));

export const PUT = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const total = parsed.data.reduce((s, p) => s + p.sharePercent, 0);
  if (total > 100) return Response.json({ error: "إجمالي النسب يتجاوز 100%" }, { status: 400 });

  await prisma.$transaction([
    prisma.partner.deleteMany({ where: { organizationId: DEFAULT_ORG_ID } }),
    prisma.partner.createMany({ data: parsed.data.map((p) => ({ ...p, organizationId: DEFAULT_ORG_ID })) }),
  ]);

  return Response.json({ ok: true });
});
```

- [ ] **Step 7: Team route**

```typescript
// app/api/mobile/team/route.ts
import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { getUserEffectivePerms } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const GET = withMobileAuth(async (_req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, permissions: true },
  });

  const withPerms = await Promise.all(
    users.map(async (u) => ({ ...u, effectivePerms: await getUserEffectivePerms(u.id) })),
  );

  return Response.json(withPerms);
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "OPERATOR", "ACCOUNTANT", "VIEWER"]),
});

export const POST = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return Response.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  const newUser = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, password: hashed, role: parsed.data.role as Role, active: true },
    select: { id: true, name: true, email: true, role: true },
  });

  return Response.json(newUser, { status: 201 });
});

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "OPERATOR", "ACCOUNTANT", "VIEWER"]).optional(),
  active: z.boolean().optional(),
});

export const PATCH = withMobileAuth(async (req, user) => {
  if (user.role !== Role.ADMIN) return Response.json({ error: "ليست لديك الصلاحية" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { userId, role, active } = parsed.data;
  await prisma.user.update({
    where: { id: userId },
    data: { ...(role ? { role: role as Role } : {}), ...(active !== undefined ? { active } : {}) },
  });

  return Response.json({ ok: true });
});
```

- [ ] **Step 8: Typecheck all new files**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 9: Commit everything**

```bash
git add app/api/mobile/
git commit -m "feat(mobile-api): add reports, analytics, search, settings, greenhouses, partners, team endpoints"
```

---

## Task 11: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push origin master
```

- [ ] **Step 2: Verify Vercel deployment succeeds**

Open the Vercel dashboard and wait for the deployment to go green. If it fails, check the build log — the most common cause is a missing env var.

- [ ] **Step 3: Smoke-test against production**

```bash
curl -s -X POST https://mushroom-greenhouse.vercel.app/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@greenhouse.local","password":"ChangeMe!2026"}' | jq .token
```

Expected: a long JWT string starting with `eyJ`.

- [ ] **Step 4: Test dashboard on production**

```bash
PROD_TOKEN="paste-token-here"
curl -s https://mushroom-greenhouse.vercel.app/api/mobile/dashboard \
  -H "Authorization: Bearer $PROD_TOKEN" | jq .activeCycle
```

Expected: the active cycle object or `null`.

---

**Plan A complete.** Proceed to Plan B (mobile app) once all Vercel routes are verified.
