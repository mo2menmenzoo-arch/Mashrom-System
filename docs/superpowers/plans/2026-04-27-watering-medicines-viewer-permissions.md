# Watering, Medicines, Viewer Role & Custom Permissions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add watering/medicines fields to operation readings, add a VIEWER role, and add per-user custom permissions controllable by admin.

**Architecture:** Three independent slices sharing one Prisma migration: (1) schema additions, (2) operations UI, (3) RBAC layer + admin UI. Permission resolution uses a single `getUserEffectivePerms()` helper that all pages call. Custom permissions override role defaults; ADMIN always bypasses both.

**Tech Stack:** Next.js 15 App Router, Prisma, PostgreSQL (Neon), React Server Components, `zod`, Tailwind, shadcn/ui (Dialog, Badge, Button, Label)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `watered`, `medicines` to `OperationReading`; add `VIEWER` to `Role`; add `UserPermissions` model |
| `actions/operation.ts` | Modify | Accept + persist `watered` and `medicines` |
| `app/(app)/operations/reading-form.tsx` | Modify | Add watering checkbox + medicines checkboxes |
| `app/(app)/operations/reading-row-actions.tsx` | Modify | Add watering + medicines fields to edit dialog |
| `app/(app)/operations/page.tsx` | Modify | Add الري + الأدوية columns to table |
| `lib/rbac.ts` | Modify | Add `VIEWER` defaults, `getUserEffectivePerms()` helper |
| `lib/medicines.ts` | Create | Hardcoded medicines list constant |
| `app/(app)/settings/users/permissions-modal.tsx` | Create | Admin modal for per-user permissions |
| `app/(app)/settings/users/actions.ts` | Modify | Add `upsertUserPermissionsAction`, `deleteUserPermissionsAction` |
| `app/(app)/settings/users/users-table.tsx` | Modify | Add "الصلاحيات" button per row |
| `app/(app)/settings/users/page.tsx` | Modify | Pass permissions data to table |
| `app/(app)/operations/page.tsx` | Modify | Guard with `getUserEffectivePerms` |
| `app/(app)/reports/page.tsx` | Modify | Hide financial totals if `canViewFinancials=false` |

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to schema**

Open `prisma/schema.prisma` and apply these changes:

In the `Role` enum, add `VIEWER`:
```prisma
enum Role {
  ADMIN
  OPERATOR
  ACCOUNTANT
  VIEWER
}
```

In `model OperationReading`, add after `notes String?`:
```prisma
  watered   Boolean  @default(false)
  medicines String[] @default([])
```

Add relation to `User` model — after `preferences UserPreferences?` line:
```prisma
  permissions UserPermissions?
```

Add new model at the end of the file:
```prisma
model UserPermissions {
  userId String @id
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  viewOperations Boolean @default(true)
  viewSales      Boolean @default(true)
  viewInventory  Boolean @default(true)
  viewExpenses   Boolean @default(true)
  viewCustody    Boolean @default(true)
  viewReports    Boolean @default(true)

  editOperations Boolean @default(false)
  editSales      Boolean @default(false)
  editInventory  Boolean @default(false)
  editExpenses   Boolean @default(false)
  editCustody    Boolean @default(false)

  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Generate and run migration**

```bash
npx prisma migrate dev --name add-watering-medicines-viewer-permissions
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add watered/medicines to OperationReading, VIEWER role, UserPermissions"
```

---

## Task 2: Medicines Constant

**Files:**
- Create: `lib/medicines.ts`

- [ ] **Step 1: Create the file**

```ts
export const MEDICINE_OPTIONS = [
  "ليدر",
  "مانع انسلاخ",
  "نصر لاثيون",
  "لمبدا",
  "كيمزيت",
] as const;

export type Medicine = (typeof MEDICINE_OPTIONS)[number];
```

- [ ] **Step 2: Commit**

```bash
git add lib/medicines.ts
git commit -m "feat: add medicines constant list"
```

---

## Task 3: Update Operation Server Actions

**Files:**
- Modify: `actions/operation.ts`

- [ ] **Step 1: Update `readingSchema` to include new fields**

Replace the existing `readingSchema` definition (lines 14–22) with:

```ts
const readingSchema = z.object({
  cycleId: z.string().min(1),
  date: z.coerce.date(),
  temperature: z.coerce.number().min(-50).max(100).optional(),
  humidity: z.coerce.number().min(0).max(100).optional(),
  co2: z.coerce.number().int().min(0).max(9999).optional(),
  cleanliness: z.enum(["EXCELLENT", "GOOD", "ACCEPTABLE", "POOR"]).optional(),
  notes: z.string().trim().max(500).optional(),
  watered: z.coerce.boolean().optional(),
  medicines: z.array(z.string()).optional(),
});
```

- [ ] **Step 2: Update `createOperationReadingAction` to parse new fields**

In `createOperationReadingAction`, replace the `safeParse` call object (inside `readingSchema.safeParse({...})`) to add:
```ts
watered: formData.get("watered") === "on" || formData.get("watered") === "true",
medicines: formData.getAll("medicines") as string[],
```

Replace the destructure line:
```ts
const { cycleId, date, temperature, humidity, co2, cleanliness, notes, watered, medicines } = parsed.data;
```

In the `tx.operationReading.create({ data: {...} })` block, add inside `data`:
```ts
watered: watered ?? false,
medicines: medicines ?? [],
```

- [ ] **Step 3: Update `updateOperationReadingAction` to parse new fields**

In `updateOperationReadingAction`, replace the partial `safeParse` call object to add:
```ts
watered: formData.get("watered") === "on" || formData.get("watered") === "true",
medicines: formData.getAll("medicines") as string[],
```

In `tx.operationReading.update({ data: {...} })` block, add:
```ts
watered: parsed.data.watered ?? false,
medicines: parsed.data.medicines ?? [],
```

Also update the `before` audit snapshot to include:
```ts
before: {
  temperature: reading.temperature,
  humidity: reading.humidity,
  co2: reading.co2,
  cleanliness: reading.cleanliness,
  watered: reading.watered,
  medicines: reading.medicines,
},
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add actions/operation.ts
git commit -m "feat(operations): accept watered and medicines in create/update actions"
```

---

## Task 4: Update Reading Form UI

**Files:**
- Modify: `app/(app)/operations/reading-form.tsx`

- [ ] **Step 1: Import medicines constant**

Add at top of file after existing imports:
```ts
import { MEDICINE_OPTIONS } from "@/lib/medicines";
```

- [ ] **Step 2: Add watering checkbox and medicines checkboxes to the form**

Inside the `<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">`, add these two blocks after the `notes` field block (before the closing `</div>`):

```tsx
<div className="space-y-2 lg:col-span-3">
  <Label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" name="watered" className="h-4 w-4 rounded border-input" />
    <span>تم الري اليوم</span>
  </Label>
</div>

<div className="space-y-2 lg:col-span-3">
  <Label>الأدوية المستخدمة (اختياري)</Label>
  <div className="flex flex-wrap gap-3">
    {MEDICINE_OPTIONS.map((med) => (
      <Label key={med} className="flex items-center gap-1.5 cursor-pointer font-normal">
        <input type="checkbox" name="medicines" value={med} className="h-4 w-4 rounded border-input" />
        <span className="text-sm">{med}</span>
      </Label>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/operations/reading-form.tsx
git commit -m "feat(operations): add watering checkbox and medicines multi-select to reading form"
```

---

## Task 5: Update Reading Row Actions (Edit Dialog)

**Files:**
- Modify: `app/(app)/operations/reading-row-actions.tsx`

- [ ] **Step 1: Import medicines constant and update Reading type**

Add import after existing imports:
```ts
import { MEDICINE_OPTIONS } from "@/lib/medicines";
```

Update the `Reading` type to include:
```ts
type Reading = {
  id: string;
  dayNumber: number;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  cleanliness: string | null;
  notes: string | null;
  watered: boolean;
  medicines: string[];
};
```

- [ ] **Step 2: Add watering and medicines fields inside the edit dialog form**

Inside `<form action={handleEdit} className="space-y-4">`, after the `notes` field block and before the error/button section, add:

```tsx
<div className="space-y-2 lg:col-span-3">
  <Label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      name="watered"
      defaultChecked={reading.watered}
      className="h-4 w-4 rounded border-input"
    />
    <span>تم الري اليوم</span>
  </Label>
</div>

<div className="space-y-2 lg:col-span-3">
  <Label>الأدوية المستخدمة</Label>
  <div className="flex flex-wrap gap-3">
    {MEDICINE_OPTIONS.map((med) => (
      <Label key={med} className="flex items-center gap-1.5 cursor-pointer font-normal">
        <input
          type="checkbox"
          name="medicines"
          value={med}
          defaultChecked={reading.medicines.includes(med)}
          className="h-4 w-4 rounded border-input"
        />
        <span className="text-sm">{med}</span>
      </Label>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/operations/reading-row-actions.tsx
git commit -m "feat(operations): add watering and medicines to edit dialog"
```

---

## Task 6: Update Operations Table Display

**Files:**
- Modify: `app/(app)/operations/page.tsx`

- [ ] **Step 1: Update the readings query to select new fields**

The `prisma.operationReading.findMany` call already returns all fields. No change needed to the query.

Update the `readings.map` type in the table to include `watered` and `medicines` — these come automatically from the Prisma result.

- [ ] **Step 2: Add two new table headers**

In `<thead>`, after the `ملاحظات` `<th>` and before the conditional `canEdit` `<th>`, add:

```tsx
<th className="py-2 font-semibold uppercase tracking-wider text-muted-foreground">الري</th>
<th className="py-2 font-semibold uppercase tracking-wider text-muted-foreground">الأدوية</th>
```

- [ ] **Step 3: Add two new table cells per row**

In the `readings.map` row render, after the `ملاحظات` `<td>` and before the conditional `canEdit` `<td>`, add:

```tsx
<td className="py-3">
  {r.watered ? (
    <Badge variant="success" className="text-xs">✓ نعم</Badge>
  ) : (
    <span className="text-muted-foreground">—</span>
  )}
</td>
<td className="py-3">
  {r.medicines.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {r.medicines.map((m) => (
        <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
      ))}
    </div>
  ) : (
    <span className="text-muted-foreground">—</span>
  )}
</td>
```

- [ ] **Step 4: Update the `ReadingRowActions` call to pass new fields**

In the `<ReadingRowActions reading={{...}} />` call, add:
```tsx
watered: r.watered,
medicines: r.medicines,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/operations/page.tsx
git commit -m "feat(operations): add الري and الأدوية columns to readings table"
```

---

## Task 7: Update RBAC Helper

**Files:**
- Modify: `lib/rbac.ts`

- [ ] **Step 1: Add VIEWER to perms and add `getUserEffectivePerms` helper**

At the top of `lib/rbac.ts`, the existing `perms` object uses `Role` from `@prisma/client` — `VIEWER` will now be included automatically after the migration.

Add `VIEWER` to read-only perms (it should NOT appear in write perms):

Replace the existing `perms` object with:
```ts
export const perms = {
  cycleManage: [Role.ADMIN] as Role[],
  cycleRead: [Role.ADMIN, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER] as Role[],
  expenseWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  operationsWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  inventoryWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  salesWrite: [Role.ADMIN, Role.ACCOUNTANT] as Role[],
  custodyWrite: [Role.ADMIN, Role.ACCOUNTANT] as Role[],
  reportsRead: [Role.ADMIN, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER] as Role[],
  usersManage: [Role.ADMIN] as Role[],
};
```

- [ ] **Step 2: Add EffectivePerms type and default maps**

Add after the `perms` object:

```ts
export type EffectivePerms = {
  viewOperations: boolean;
  editOperations: boolean;
  viewSales: boolean;
  editSales: boolean;
  viewInventory: boolean;
  editInventory: boolean;
  viewExpenses: boolean;
  editExpenses: boolean;
  viewCustody: boolean;
  editCustody: boolean;
  viewReports: boolean;
  canViewFinancials: boolean;
  canViewPartners: boolean;
};

const ROLE_DEFAULT_PERMS: Record<Role, EffectivePerms> = {
  [Role.ADMIN]: {
    viewOperations: true, editOperations: true,
    viewSales: true, editSales: true,
    viewInventory: true, editInventory: true,
    viewExpenses: true, editExpenses: true,
    viewCustody: true, editCustody: true,
    viewReports: true,
    canViewFinancials: true,
    canViewPartners: true,
  },
  [Role.OPERATOR]: {
    viewOperations: true, editOperations: true,
    viewSales: true, editSales: false,
    viewInventory: true, editInventory: true,
    viewExpenses: true, editExpenses: true,
    viewCustody: true, editCustody: false,
    viewReports: true,
    canViewFinancials: false,
    canViewPartners: false,
  },
  [Role.ACCOUNTANT]: {
    viewOperations: true, editOperations: false,
    viewSales: true, editSales: true,
    viewInventory: true, editInventory: false,
    viewExpenses: true, editExpenses: false,
    viewCustody: true, editCustody: true,
    viewReports: true,
    canViewFinancials: false,
    canViewPartners: false,
  },
  [Role.VIEWER]: {
    viewOperations: true, editOperations: false,
    viewSales: true, editSales: false,
    viewInventory: true, editInventory: false,
    viewExpenses: true, editExpenses: false,
    viewCustody: true, editCustody: false,
    viewReports: true,
    canViewFinancials: false,
    canViewPartners: false,
  },
};
```

- [ ] **Step 3: Add `getUserEffectivePerms` function**

Add after the `ROLE_DEFAULT_PERMS` constant:

```ts
export async function getUserEffectivePerms(userId: string): Promise<EffectivePerms> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true },
  });
  if (!user) throw new AuthorizationError("المستخدم غير موجود");

  if (user.role === Role.ADMIN) return ROLE_DEFAULT_PERMS[Role.ADMIN];

  if (!user.permissions) return ROLE_DEFAULT_PERMS[user.role];

  const p = user.permissions;
  return {
    viewOperations: p.viewOperations,
    editOperations: p.editOperations,
    viewSales: p.viewSales,
    editSales: p.editSales,
    viewInventory: p.viewInventory,
    editInventory: p.editInventory,
    viewExpenses: p.viewExpenses,
    editExpenses: p.editExpenses,
    viewCustody: p.viewCustody,
    editCustody: p.editCustody,
    viewReports: p.viewReports,
    canViewFinancials: false,
    canViewPartners: false,
  };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add lib/rbac.ts
git commit -m "feat(rbac): add VIEWER role defaults and getUserEffectivePerms helper"
```

---

## Task 8: Per-User Permissions Admin UI

**Files:**
- Create: `app/(app)/settings/users/permissions-modal.tsx`
- Modify: `app/(app)/settings/users/actions.ts`
- Modify: `app/(app)/settings/users/users-table.tsx`
- Modify: `app/(app)/settings/users/page.tsx`

- [ ] **Step 1: Add server actions for permissions**

In `app/(app)/settings/users/actions.ts`, add at the end of the file:

```ts
export type PermissionsInput = {
  viewOperations: boolean; editOperations: boolean;
  viewSales: boolean;      editSales: boolean;
  viewInventory: boolean;  editInventory: boolean;
  viewExpenses: boolean;   editExpenses: boolean;
  viewCustody: boolean;    editCustody: boolean;
  viewReports: boolean;
};

export async function upsertUserPermissionsAction(userId: string, data: PermissionsInput) {
  await requireRole(perms.usersManage);
  await prisma.userPermissions.upsert({
    where: { userId },
    update: { ...data },
    create: { userId, ...data },
  });
  revalidatePath("/settings/users");
}

export async function deleteUserPermissionsAction(userId: string) {
  await requireRole(perms.usersManage);
  await prisma.userPermissions.deleteMany({ where: { userId } });
  revalidatePath("/settings/users");
}
```

- [ ] **Step 2: Create the permissions modal component**

Create `app/(app)/settings/users/permissions-modal.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { upsertUserPermissionsAction, deleteUserPermissionsAction } from "./actions";
import type { PermissionsInput } from "./actions";

type Section = {
  key: keyof PermissionsInput;
  editKey: keyof PermissionsInput;
  label: string;
};

const SECTIONS: Section[] = [
  { key: "viewOperations", editKey: "editOperations", label: "جدول التشغيل" },
  { key: "viewSales",      editKey: "editSales",      label: "المبيعات" },
  { key: "viewInventory",  editKey: "editInventory",  label: "المخزون" },
  { key: "viewExpenses",   editKey: "editExpenses",   label: "المصروفات" },
  { key: "viewCustody",    editKey: "editCustody",    label: "العهدة" },
  { key: "viewReports",    editKey: "viewReports",    label: "التقارير" },
];

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  permissions: PermissionsInput | null;
};

const DEFAULT_PERMS: PermissionsInput = {
  viewOperations: true, editOperations: false,
  viewSales: true,      editSales: false,
  viewInventory: true,  editInventory: false,
  viewExpenses: true,   editExpenses: false,
  viewCustody: true,    editCustody: false,
  viewReports: true,
};

export function PermissionsModal({ user }: { user: UserRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [perms, setPerms] = useState<PermissionsInput>(user.permissions ?? DEFAULT_PERMS);

  function toggle(key: keyof PermissionsInput) {
    setPerms((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // If disabling view, also disable edit
      const viewKey = key as string;
      if (viewKey.startsWith("view")) {
        const editKey = ("edit" + viewKey.slice(4)) as keyof PermissionsInput;
        if (!next[key]) next[editKey] = false;
      }
      // If enabling edit, also enable view
      if (viewKey.startsWith("edit")) {
        const viewK = ("view" + viewKey.slice(4)) as keyof PermissionsInput;
        if (next[key]) next[viewK] = true;
      }
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertUserPermissionsAction(user.id, perms);
        setOpen(false);
        router.refresh();
      } catch { setError("حدث خطأ أثناء الحفظ"); }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserPermissionsAction(user.id);
        setPerms(DEFAULT_PERMS);
        setOpen(false);
        router.refresh();
      } catch { setError("حدث خطأ أثناء إزالة التخصيص"); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">الصلاحيات</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>صلاحيات {user.name ?? user.email}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 text-right font-medium">القسم</th>
                <th className="py-2 text-center font-medium">رؤية</th>
                <th className="py-2 text-center font-medium">تعديل</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((s) => {
                const isReportsRow = s.key === "viewReports" && s.editKey === "viewReports";
                return (
                  <tr key={s.key} className="border-b last:border-0">
                    <td className="py-2">{s.label}</td>
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={perms[s.key]}
                        onChange={() => toggle(s.key)}
                        className="h-4 w-4 rounded border-input"
                      />
                    </td>
                    <td className="py-2 text-center">
                      {isReportsRow ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={perms[s.editKey]}
                          onChange={() => toggle(s.editKey)}
                          disabled={!perms[s.key]}
                          className="h-4 w-4 rounded border-input disabled:opacity-40"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b last:border-0 opacity-50">
                <td className="py-2">الإجماليات المالية / الشركاء</td>
                <td className="py-2 text-center"><Badge variant="secondary" className="text-xs">مقفول</Badge></td>
                <td className="py-2 text-center"><Badge variant="secondary" className="text-xs">مقفول</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" disabled={pending} onClick={handleRemove}>
            إزالة التخصيص
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button disabled={pending} onClick={handleSave}>
              {pending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Update users page to fetch permissions**

In `app/(app)/settings/users/page.tsx`, update the prisma query to include permissions and role:

```ts
const users = await prisma.user.findMany({
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    active: true,
    createdAt: true,
    permissions: true,
  },
});
```

Also fetch the current session to know if user is admin:
```ts
import { auth } from "@/auth";
// inside the function:
const session = await auth();
const isAdmin = session?.user?.role === "ADMIN";
```

Pass `isAdmin` to `UsersTable`:
```tsx
<UsersTable users={rows} isAdmin={isAdmin} />
```

Update `rows` mapping to include `permissions`:
```ts
const rows = users.map((u) => ({
  ...u,
  formattedDate: formatDate(u.createdAt),
  permissions: u.permissions
    ? {
        viewOperations: u.permissions.viewOperations,
        editOperations: u.permissions.editOperations,
        viewSales: u.permissions.viewSales,
        editSales: u.permissions.editSales,
        viewInventory: u.permissions.viewInventory,
        editInventory: u.permissions.editInventory,
        viewExpenses: u.permissions.viewExpenses,
        editExpenses: u.permissions.editExpenses,
        viewCustody: u.permissions.viewCustody,
        editCustody: u.permissions.editCustody,
        viewReports: u.permissions.viewReports,
      }
    : null,
}));
```

- [ ] **Step 4: Update UsersTable to show permissions button**

In `app/(app)/settings/users/users-table.tsx`:

Add import:
```ts
import { PermissionsModal } from "./permissions-modal";
import type { PermissionsInput } from "./actions";
```

Update `User` type:
```ts
type User = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  active: boolean;
  formattedDate: string;
  permissions: PermissionsInput | null;
};
```

Update `UsersTable` props:
```ts
export function UsersTable({ users, isAdmin }: { users: User[]; isAdmin: boolean }) {
```

Add `VIEWER` to `ROLE_LABELS`:
```ts
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "مدير",
  OPERATOR: "مشغّل",
  ACCOUNTANT: "محاسب",
  VIEWER: "مراقب",
};
```

In the table row, in the `<td>` that contains `<ActiveCell />`, add after it a new `<td>`:
```tsx
{isAdmin && (
  <td className="py-3">
    <PermissionsModal user={{ id: user.id, name: user.name, email: user.email, permissions: user.permissions }} />
  </td>
)}
```

Add matching header `<th>` in `<thead>`:
```tsx
{isAdmin && <th className="py-2 font-medium">الصلاحيات</th>}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/settings/users/
git commit -m "feat(users): add per-user permissions modal with view/edit toggles per section"
```

---

## Task 9: Guard Section Pages with Effective Permissions

**Files:**
- Modify: `app/(app)/operations/page.tsx`
- Modify: `app/(app)/reports/page.tsx`

- [ ] **Step 1: Guard operations page**

In `app/(app)/operations/page.tsx`, add imports:
```ts
import { getSessionUser, getUserEffectivePerms } from "@/lib/rbac";
```

Replace the existing session + role check at the top of `OperationsPage`:
```ts
const session = await auth();
const role = session?.user?.role;
const canEdit = role === "ADMIN" || role === "OPERATOR";
```

With:
```ts
let effectivePerms = null;
try {
  const user = await getSessionUser();
  effectivePerms = await getUserEffectivePerms(user.id);
} catch {
  // unauthenticated — middleware handles redirect
}

if (effectivePerms && !effectivePerms.viewOperations) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">جدول التشغيل</h1>
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          غير مصرح بالوصول إلى هذا القسم.
        </CardContent>
      </Card>
    </div>
  );
}

const canEdit = effectivePerms?.editOperations ?? false;
```

Remove the old `auth()` import if it's no longer used elsewhere in the file.

- [ ] **Step 2: Guard reports financial totals**

In `app/(app)/reports/page.tsx`, add imports:
```ts
import { getSessionUser, getUserEffectivePerms } from "@/lib/rbac";
```

At the top of `ReportsPage`, after the existing data fetching, add:
```ts
let canViewFinancials = false;
try {
  const user = await getSessionUser();
  const ep = await getUserEffectivePerms(user.id);
  canViewFinancials = ep.canViewFinancials;
} catch { /* unauthenticated */ }
```

Then wherever `totalRevenue`, `totalExpenses`, `totalNet` are rendered in JSX, wrap with:
```tsx
{canViewFinancials ? formatEGP(totalRevenue) : <span className="text-muted-foreground">—</span>}
```

Do the same for `totalNet` and any partner share breakdown.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/operations/page.tsx app/\(app\)/reports/page.tsx
git commit -m "feat(rbac): guard operations and reports pages with effective permissions"
```

---

## Task 10: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git push origin master
```

Expected: Vercel auto-deploy triggered.

---

## Self-Review Notes

- All 3 spec features covered: watering/medicines (Tasks 1–6), VIEWER role (Tasks 1, 7), custom permissions (Tasks 7–9)
- `MEDICINE_OPTIONS` defined in Task 2, used consistently in Tasks 4 and 5
- `EffectivePerms` type defined in Task 7, used in Task 9
- `PermissionsInput` type defined in Task 8 actions, used in modal + table
- `getUserEffectivePerms` defined in Task 7, called in Task 9
- Migration defaults ensure existing rows are unaffected
- Financial totals hidden (not removed) — non-admin users see "—" instead of numbers
- Partners page protection: `canViewPartners` is always false for non-ADMIN; partners page already in settings which is ADMIN-only via `perms.usersManage`
