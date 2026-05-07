# Inventory CRUD + Reports Profit + Settings Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD to the inventory page, add total-profit KPI cards to reports, and fix settings layout for mobile.

**Architecture:** Three independent feature areas. Inventory gets new server actions + client row-actions component mirroring the expenses pattern. Reports page gets two new computed KPI values (total net profit across all cycles, selected-cycle net already exists). Settings sidebar becomes a responsive component that renders vertical tabs on mobile and the existing sidebar on desktop.

**Tech Stack:** Next.js 15 App Router, Prisma, Zod, Radix UI Dialog/AlertDialog, Tailwind CSS, `useTransition` + `router.refresh()` pattern.

---

## File Map

| Action | File |
|--------|------|
| Create | `actions/inventory.ts` |
| Modify | `app/(app)/inventory/page.tsx` |
| Create | `app/(app)/inventory/inventory-item-actions.tsx` |
| Create | `app/(app)/inventory/add-inventory-item-dialog.tsx` |
| Create | `app/(app)/inventory/add-inventory-txn-dialog.tsx` |
| Modify | `app/(app)/reports/page.tsx` |
| Modify | `app/(app)/settings/settings-sidebar.tsx` |
| Modify | `app/(app)/settings/layout.tsx` |

---

## Task 1: Server Actions for Inventory CRUD

**Files:**
- Create: `actions/inventory.ts`

- [ ] **Step 1: Create `actions/inventory.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction, InventoryTxnType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/cycle";

export type { ActionResult };

// ─── Add Item ───────────────────────────────────────────────────────────────

const addItemSchema = z.object({
  cycleId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  initialQty: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(20).default("وحدة"),
  expiryDate: z.coerce.date().optional(),
  lowStockAt: z.coerce.number().positive().optional(),
});

export async function addInventoryItemAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const raw = {
      cycleId: formData.get("cycleId"),
      name: formData.get("name"),
      initialQty: formData.get("initialQty"),
      unit: formData.get("unit") || "وحدة",
      expiryDate: formData.get("expiryDate") || undefined,
      lowStockAt: formData.get("lowStockAt") || undefined,
    };

    const parsed = addItemSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await assertCycleOpen(parsed.data.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "InventoryItem",
      entityId: (result: { id: string }) => result.id,
      mutate: async (tx) => {
        const item = await tx.inventoryItem.create({
          data: {
            cycleId: parsed.data.cycleId,
            name: parsed.data.name,
            initialQty: parsed.data.initialQty,
            unit: parsed.data.unit,
            expiryDate: parsed.data.expiryDate ?? null,
            lowStockAt: parsed.data.lowStockAt ?? null,
            source: "DIRECT_PURCHASE",
          },
        });
        await tx.inventoryTxn.create({
          data: {
            itemId: item.id,
            type: InventoryTxnType.IN,
            qty: parsed.data.initialQty,
          },
        });
        return item;
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

// ─── Update Item ─────────────────────────────────────────────────────────────

const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(20),
  expiryDate: z.coerce.date().optional(),
  lowStockAt: z.coerce.number().positive().optional(),
});

export async function updateInventoryItemAction(
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "الصنف غير موجود" };

    await assertCycleOpen(item.cycleId, { userRole: user.role });

    const parsed = updateItemSchema.safeParse({
      name: formData.get("name"),
      unit: formData.get("unit") || "وحدة",
      expiryDate: formData.get("expiryDate") || undefined,
      lowStockAt: formData.get("lowStockAt") || undefined,
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "InventoryItem",
      entityId: () => itemId,
      before: { name: item.name, unit: item.unit },
      mutate: (tx) =>
        tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            name: parsed.data.name,
            unit: parsed.data.unit,
            expiryDate: parsed.data.expiryDate ?? null,
            lowStockAt: parsed.data.lowStockAt ?? null,
          },
        }),
    });

    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

// ─── Delete Item ─────────────────────────────────────────────────────────────

export async function deleteInventoryItemAction(itemId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "الصنف غير موجود" };

    if (item.source === "OPERATING_EXPENSE") {
      return { ok: false, error: "لا يمكن حذف صنف مرتبط بمصروف. احذف المصروف بدلاً من ذلك." };
    }

    await assertCycleOpen(item.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "InventoryItem",
      entityId: () => itemId,
      before: { name: item.name },
      mutate: (tx) => tx.inventoryItem.delete({ where: { id: itemId } }),
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

// ─── Add Transaction ─────────────────────────────────────────────────────────

const addTxnSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUST"]),
  qty: z.coerce.number().positive(),
  reason: z.string().trim().max(200).optional(),
});

export async function addInventoryTxnAction(
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.inventoryWrite);

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "الصنف غير موجود" };

    await assertCycleOpen(item.cycleId, { userRole: user.role });

    const parsed = addTxnSchema.safeParse({
      type: formData.get("type"),
      qty: formData.get("qty"),
      reason: formData.get("reason") || undefined,
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    // OUT and ADJUST are stored as negative qty
    const signedQty =
      parsed.data.type === "IN" ? parsed.data.qty : -parsed.data.qty;

    await withAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "InventoryTxn",
      entityId: (result: { id: string }) => result.id,
      mutate: (tx) =>
        tx.inventoryTxn.create({
          data: {
            itemId,
            type: parsed.data.type as InventoryTxnType,
            qty: signedQty,
            reason: parsed.data.reason ?? null,
          },
        }),
    });

    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/inventory.ts
git commit -m "feat(inventory): add server actions for item CRUD and transactions"
```

---

## Task 2: Inventory Row Actions Component

**Files:**
- Create: `app/(app)/inventory/inventory-item-actions.tsx`

- [ ] **Step 1: Create `app/(app)/inventory/inventory-item-actions.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  updateInventoryItemAction,
  deleteInventoryItemAction,
  addInventoryTxnAction,
} from "@/actions/inventory";

type Item = {
  id: string;
  name: string;
  unit: string;
  expiryDate: string | null;
  lowStockAt: number | null;
  source: string;
};

export function InventoryItemActions({ item }: { item: Item }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleEdit(formData: FormData) {
    setEditError(null);
    startTransition(async () => {
      try {
        const result = await updateInventoryItemAction(item.id, formData);
        if (!result.ok) setEditError(result.error ?? "خطأ");
        else {
          setEditOpen(false);
          router.refresh();
        }
      } catch {
        setEditError("حدث خطأ غير متوقع");
      }
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      try {
        const result = await deleteInventoryItemAction(item.id);
        if (!result.ok) setDeleteError(result.error ?? "خطأ");
        else router.refresh();
      } catch {
        setDeleteError("حدث خطأ غير متوقع");
      }
    });
  }

  function handleAddTxn(formData: FormData) {
    setTxnError(null);
    startTransition(async () => {
      try {
        const result = await addInventoryTxnAction(item.id, formData);
        if (!result.ok) setTxnError(result.error ?? "خطأ");
        else {
          setTxnOpen(false);
          router.refresh();
        }
      } catch {
        setTxnError("حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      {/* Add Transaction */}
      <Dialog open={txnOpen} onOpenChange={(o) => { setTxnOpen(o); setTxnError(null); }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending} title="إضافة حركة">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة حركة — {item.name}</DialogTitle>
          </DialogHeader>
          <form action={handleAddTxn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`txn-type-${item.id}`}>النوع</Label>
              <select
                id={`txn-type-${item.id}`}
                name="type"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue="IN"
              >
                <option value="IN">إضافة (وارد)</option>
                <option value="OUT">سحب (صادر)</option>
                <option value="ADJUST">تعديل (جرد)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`txn-qty-${item.id}`}>الكمية ({item.unit})</Label>
              <Input
                id={`txn-qty-${item.id}`}
                name="qty"
                type="number"
                required
                min="0.01"
                step="0.01"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`txn-reason-${item.id}`}>السبب (اختياري)</Label>
              <Input
                id={`txn-reason-${item.id}`}
                name="reason"
                type="text"
                maxLength={200}
              />
            </div>
            {txnError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{txnError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTxnOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setEditError(null); }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل صنف — {item.name}</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`item-name-${item.id}`}>اسم الصنف</Label>
              <Input
                id={`item-name-${item.id}`}
                name="name"
                type="text"
                required
                maxLength={100}
                defaultValue={item.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-unit-${item.id}`}>الوحدة</Label>
              <Input
                id={`item-unit-${item.id}`}
                name="unit"
                type="text"
                required
                maxLength={20}
                defaultValue={item.unit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-expiry-${item.id}`}>تاريخ الانتهاء (اختياري)</Label>
              <Input
                id={`item-expiry-${item.id}`}
                name="expiryDate"
                type="date"
                defaultValue={item.expiryDate ?? ""}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-lowstock-${item.id}`}>حد التنبيه — كمية منخفضة (اختياري)</Label>
              <Input
                id={`item-lowstock-${item.id}`}
                name="lowStockAt"
                type="number"
                min="0.01"
                step="0.01"
                className="tabular-nums"
                defaultValue={item.lowStockAt ?? ""}
              />
            </div>
            {editError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{editError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-destructive hover:text-destructive"
            title="حذف"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الصنف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف &quot;{item.name}&quot;؟ سيتم حذف جميع حركاته أيضاً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/inventory/inventory-item-actions.tsx
git commit -m "feat(inventory): add row actions component (edit/delete/add-txn)"
```

---

## Task 3: Add Item Dialog + Wire Inventory Page

**Files:**
- Create: `app/(app)/inventory/add-inventory-item-dialog.tsx`
- Modify: `app/(app)/inventory/page.tsx`

- [ ] **Step 1: Create `app/(app)/inventory/add-inventory-item-dialog.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addInventoryItemAction } from "@/actions/inventory";

export function AddInventoryItemDialog({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("cycleId", cycleId);
    startTransition(async () => {
      try {
        const result = await addInventoryItemAction(formData);
        if (!result.ok) setError(result.error ?? "خطأ");
        else {
          setOpen(false);
          router.refresh();
        }
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          إضافة صنف
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة صنف جديد للمخزن</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-item-name">اسم الصنف</Label>
            <Input
              id="add-item-name"
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="مثال: بذور فطر"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-item-qty">الكمية الأولية</Label>
              <Input
                id="add-item-qty"
                name="initialQty"
                type="number"
                required
                min="0.01"
                step="0.01"
                className="tabular-nums"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-item-unit">الوحدة</Label>
              <Input
                id="add-item-unit"
                name="unit"
                type="text"
                required
                maxLength={20}
                defaultValue="وحدة"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-item-expiry">تاريخ الانتهاء (اختياري)</Label>
            <Input
              id="add-item-expiry"
              name="expiryDate"
              type="date"
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-item-lowstock">حد التنبيه — كمية منخفضة (اختياري)</Label>
            <Input
              id="add-item-lowstock"
              name="lowStockAt"
              type="number"
              min="0.01"
              step="0.01"
              className="tabular-nums"
              placeholder="0.00"
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "إضافة الصنف"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update `app/(app)/inventory/page.tsx`**

Add imports at the top (after existing imports):
```typescript
import { AddInventoryItemDialog } from "./add-inventory-item-dialog";
import { InventoryItemActions } from "./inventory-item-actions";
```

Replace the header section (lines 58–69) — the `<div className="flex flex-wrap items-center justify-between gap-4">` block — with:
```tsx
<div className="flex flex-wrap items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold">المخزن</h1>
    <p className="text-sm text-muted-foreground">مخزون الدورة الحالية</p>
  </div>
  <div className="flex items-center gap-2">
    {alertCount > 0 && (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {formatInt(alertCount)} تنبيه
      </Badge>
    )}
    <AddInventoryItemDialog cycleId={activeCycle.id} />
  </div>
</div>
```

Add an "الإجراءات" column header to the `<thead>` after the "الحالة" `<th>`:
```tsx
<th className="py-2 font-semibold uppercase tracking-wider text-muted-foreground">الإجراءات</th>
```

Add the actions cell at the end of each `<tr>` in the `<tbody>`, inside the `.map((item) => ...)` block, after the last `<td>`:
```tsx
<td className="py-3">
  <InventoryItemActions
    item={{
      id: item.id,
      name: item.name,
      unit: item.unit,
      expiryDate: item.expiryDate ? item.expiryDate.toISOString().split("T")[0] : null,
      lowStockAt: item.lowStockAt !== null ? Number(item.lowStockAt) : null,
      source: item.source,
    }}
  />
</td>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/inventory/add-inventory-item-dialog.tsx app/\(app\)/inventory/page.tsx
git commit -m "feat(inventory): add item dialog and wire row actions into inventory page"
```

---

## Task 4: Reports — Total Profit KPI Cards

**Files:**
- Modify: `app/(app)/reports/page.tsx`

The page already computes `totalRevenue` and `totalExpenses`. We need to add `totalNet` (sum of all cycles' net profit) and a `selectedNet` card when a cycle is selected.

- [ ] **Step 1: Add `totalNet` computation**

In `app/(app)/reports/page.tsx`, after line 52 (`const totalExpenses = ...`), add:
```typescript
const totalNet = allPnL.reduce((s, p) => s + p.net, 0);
```

- [ ] **Step 2: Update the Global KPI grid**

Change the grid from `sm:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-4` and add the new KPI card. Replace the entire `{/* Global KPI cards */}` block (lines 70–97) with:

```tsx
{/* Global KPI cards */}
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <KpiCard
    label="إجمالي المبيعات"
    value={formatEGP(totalRevenue)}
    accent="success"
    icon={<TrendingUp className="h-5 w-5" />}
  />
  <KpiCard
    label="إجمالي المصاريف"
    value={formatEGP(totalExpenses)}
    accent="destructive"
    icon={<TrendingDown className="h-5 w-5" />}
  />
  <KpiCard
    label="رصيد العهدة الحالي"
    value={formatEGP(custodyBalance)}
    accent={custodyBalance < CUSTODY_LOW_THRESHOLD ? "warning" : "success"}
    icon={<CircleDollarSign className="h-5 w-5" />}
    badge={
      custodyBalance < CUSTODY_LOW_THRESHOLD ? (
        <span className="flex items-center gap-1 text-xs text-warning">
          <AlertTriangle className="h-3 w-3" />
          رصيد منخفض
        </span>
      ) : null
    }
  />
  <KpiCard
    label={totalNet >= 0 ? "إجمالي صافي الربح" : "إجمالي صافي الخسارة"}
    value={formatEGP(Math.abs(totalNet))}
    accent={totalNet >= 0 ? "success" : "destructive"}
    icon={totalNet >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
  />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/reports/page.tsx
git commit -m "feat(reports): add total net profit KPI card to global summary"
```

---

## Task 5: Settings — Mobile Responsive Layout

**Files:**
- Modify: `app/(app)/settings/settings-sidebar.tsx`
- Modify: `app/(app)/settings/layout.tsx`

The fix: on mobile, render horizontal scrollable tabs above the content instead of a sidebar beside it. On desktop (`md:`), keep the existing sidebar.

- [ ] **Step 1: Update `app/(app)/settings/settings-sidebar.tsx`**

Replace the entire file content with:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Leaf, DollarSign, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/settings/account",       icon: User,        label: "الحساب" },
  { href: "/settings/greenhouse",    icon: Leaf,        label: "إعدادات الصوبة" },
  { href: "/settings/financial",     icon: DollarSign,  label: "المالية" },
  { href: "/settings/system",        icon: Settings,    label: "النظام والبيانات" },
  { href: "/settings/notifications", icon: Bell,        label: "الإشعارات" },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: horizontal scrollable tabs */}
      <nav className="md:hidden w-full overflow-x-auto border-b pb-0 mb-4">
        <div className="flex gap-1 min-w-max px-1 pb-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:block w-56 shrink-0">
        <div className="sticky top-6">
          <p className="mb-3 px-3 text-xs font-semibold text-muted-foreground">
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
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
    </>
  );
}
```

- [ ] **Step 2: Update `app/(app)/settings/layout.tsx`**

Replace the entire file content with:

```typescript
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
    <div className="flex flex-col gap-0 md:flex-row md:gap-8">
      <SettingsSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/settings/settings-sidebar.tsx app/\(app\)/settings/layout.tsx
git commit -m "fix(settings): responsive mobile tabs layout for settings navigation"
```

---

## Task 6: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git push origin master
```

Expected: Vercel picks up the push and auto-deploys.
