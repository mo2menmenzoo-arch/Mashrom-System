# Edit/Delete Row Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit and delete buttons to every row in sales, expenses, custody (deposits + withdrawals), and operation readings tables.

**Architecture:** Each section gets a `*-row-actions.tsx` client component (following `cycle-actions.tsx` pattern) that renders a Pencil icon button opening a pre-filled Dialog + a Trash icon button with AlertDialog confirmation. Missing server actions are added to existing action files. Pages pass serialized row data + a `canEdit` boolean derived from the session role.

**Tech Stack:** Next.js 15 server components, shadcn Dialog + AlertDialog, `useTransition`, Prisma, Zod, `withAudit`

---

## File Map

| File | Change |
|------|--------|
| `components/ui/dialog.tsx` | **Create** — shadcn Dialog component |
| `actions/sale.ts` | **Modify** — add `updateSaleAction`, `deleteSaleAction` |
| `actions/expense.ts` | **Modify** — add `updateExpenseAction` |
| `actions/custody.ts` | **Modify** — add `updateDepositAction`, `deleteDepositAction`, `updateWithdrawalAction`, `deleteWithdrawalAction` |
| `actions/operation.ts` | **Modify** — add `deleteOperationReadingAction` |
| `app/(app)/sales/sale-row-actions.tsx` | **Create** — edit Dialog + delete AlertDialog for sales |
| `app/(app)/expenses/expense-row-actions.tsx` | **Create** — edit Dialog + delete AlertDialog for expenses |
| `app/(app)/custody/custody-row-actions.tsx` | **Create** — edit Dialog + delete AlertDialog for deposits & withdrawals |
| `app/(app)/operations/reading-row-actions.tsx` | **Create** — edit Dialog + delete AlertDialog for readings |
| `app/(app)/sales/page.tsx` | **Modify** — add session role check + actions column |
| `app/(app)/expenses/page.tsx` | **Modify** — add session role check + actions column |
| `app/(app)/custody/page.tsx` | **Modify** — add session role check + actions column |
| `app/(app)/operations/page.tsx` | **Modify** — add session role check + actions column |

---

### Task 1: Install shadcn Dialog component

**Files:**
- Create: `components/ui/dialog.tsx`

- [ ] **Step 1: Install via shadcn CLI**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx shadcn@latest add dialog --yes
```

Expected output: `✔ Done!` and `components/ui/dialog.tsx` created.

- [ ] **Step 2: Verify file exists**

```bash
ls components/ui/dialog.tsx
```

Expected: file path printed.

- [ ] **Step 3: Commit**

```bash
git add components/ui/dialog.tsx
git commit -m "feat: add shadcn dialog component"
```

---

### Task 2: Sale server actions — update + delete

**Files:**
- Modify: `actions/sale.ts`

- [ ] **Step 1: Add `updateSaleAction` and `deleteSaleAction` to `actions/sale.ts`**

Append the following to the end of `actions/sale.ts` (after the existing `recordPaymentAction`):

```typescript
const updateSaleSchema = z.object({
  date: z.coerce.date(),
  customerName: z.string().trim().min(1).max(100),
  cartons: z.coerce.number().int().positive(),
  pricePerCarton: z.coerce.number().positive(),
  paid: z.coerce.number().min(0),
});

export async function updateSaleAction(
  saleId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.salesWrite);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { ok: false, error: "البيع غير موجود" };

    await assertCycleOpen(sale.cycleId, { userRole: user.role });

    const parsed = updateSaleSchema.safeParse({
      date: formData.get("date"),
      customerName: formData.get("customerName"),
      cartons: formData.get("cartons"),
      pricePerCarton: formData.get("pricePerCarton"),
      paid: formData.get("paid") ?? "0",
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const { date, customerName, cartons, pricePerCarton, paid } = parsed.data;
    const total = Number((cartons * pricePerCarton).toFixed(2));
    if (paid > total) return { ok: false, error: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Sale",
      entityId: () => saleId,
      before: { cartons: sale.cartons, pricePerCarton: sale.pricePerCarton, paid: sale.paid },
      mutate: async (tx) => {
        if (sale.inventoryItemId && cartons !== sale.cartons) {
          await tx.inventoryTxn.updateMany({
            where: { saleId },
            data: { qty: -cartons },
          });
        }
        return tx.sale.update({
          where: { id: saleId },
          data: { date, customerName, cartons, pricePerCarton, total, paid },
        });
      },
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function deleteSaleAction(saleId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.salesWrite);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { ok: false, error: "البيع غير موجود" };

    await assertCycleOpen(sale.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "Sale",
      entityId: () => saleId,
      before: { customerName: sale.customerName, total: sale.total },
      mutate: async (tx) => {
        await tx.inventoryTxn.deleteMany({ where: { saleId } });
        return tx.sale.delete({ where: { id: saleId } });
      },
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in `actions/sale.ts`.

- [ ] **Step 3: Commit**

```bash
git add actions/sale.ts
git commit -m "feat: add updateSaleAction and deleteSaleAction"
```

---

### Task 3: Expense server action — update

**Files:**
- Modify: `actions/expense.ts`

- [ ] **Step 1: Add `updateExpenseAction` to `actions/expense.ts`**

Append after the existing `deleteExpenseAction`:

```typescript
const updateExpenseSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
});

export async function updateExpenseAction(
  expenseId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.expenseWrite);

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) return { ok: false, error: "المصروف غير موجود" };

    await assertCycleOpen(expense.cycleId, { userRole: user.role });

    const parsed = updateExpenseSchema.safeParse({
      date: formData.get("date"),
      description: formData.get("description"),
      amount: formData.get("amount"),
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "Expense",
      entityId: () => expenseId,
      before: { description: expense.description, amount: expense.amount },
      mutate: (tx) =>
        tx.expense.update({
          where: { id: expenseId },
          data: {
            date: parsed.data.date,
            description: parsed.data.description,
            amount: parsed.data.amount,
          },
        }),
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in `actions/expense.ts`.

- [ ] **Step 3: Commit**

```bash
git add actions/expense.ts
git commit -m "feat: add updateExpenseAction"
```

---

### Task 4: Custody server actions — update + delete for deposits and withdrawals

**Files:**
- Modify: `actions/custody.ts`

- [ ] **Step 1: Add import for `prisma` at the top of `actions/custody.ts`**

The current file does not import `prisma`. Add it — change the import block at the top:

```typescript
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms, assertCycleOpen } from "@/lib/rbac";
import { withAudit } from "@/lib/audit";
import { getCustodyBalance } from "@/lib/custody";
import type { ActionResult } from "@/actions/cycle";
```

- [ ] **Step 2: Append four new actions to `actions/custody.ts`**

```typescript
const updateDepositSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(200).optional(),
});

export async function updateDepositAction(
  depositId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const deposit = await prisma.custodyDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return { ok: false, error: "الإيداع غير موجود" };

    await assertCycleOpen(deposit.cycleId, { userRole: user.role });

    const parsed = updateDepositSchema.safeParse({
      date: formData.get("date"),
      amount: formData.get("amount"),
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "CustodyDeposit",
      entityId: () => depositId,
      before: { amount: deposit.amount },
      mutate: (tx) =>
        tx.custodyDeposit.update({
          where: { id: depositId },
          data: {
            date: parsed.data.date,
            amount: parsed.data.amount,
            notes: parsed.data.notes ?? null,
          },
        }),
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function deleteDepositAction(depositId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const deposit = await prisma.custodyDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return { ok: false, error: "الإيداع غير موجود" };

    await assertCycleOpen(deposit.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "CustodyDeposit",
      entityId: () => depositId,
      before: { amount: deposit.amount },
      mutate: (tx) => tx.custodyDeposit.delete({ where: { id: depositId } }),
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

const updateWithdrawalSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
});

export async function updateWithdrawalAction(
  withdrawalId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const withdrawal = await prisma.custodyWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) return { ok: false, error: "الصرفية غير موجودة" };

    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role });

    const parsed = updateWithdrawalSchema.safeParse({
      date: formData.get("date"),
      description: formData.get("description"),
      amount: formData.get("amount"),
    });
    if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة" };

    const balanceWithoutThis = (await getCustodyBalance()) + Number(withdrawal.amount);
    if (parsed.data.amount > balanceWithoutThis) {
      return {
        ok: false,
        error: `المبلغ يتجاوز رصيد العهدة. الحد الأقصى: ${balanceWithoutThis.toFixed(2)} ج.م`,
      };
    }

    await withAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: "CustodyWithdrawal",
      entityId: () => withdrawalId,
      before: { amount: withdrawal.amount, description: withdrawal.description },
      mutate: (tx) =>
        tx.custodyWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            date: parsed.data.date,
            description: parsed.data.description,
            amount: parsed.data.amount,
          },
        }),
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function deleteWithdrawalAction(withdrawalId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.custodyWrite);

    const withdrawal = await prisma.custodyWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) return { ok: false, error: "الصرفية غير موجودة" };

    await assertCycleOpen(withdrawal.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "CustodyWithdrawal",
      entityId: () => withdrawalId,
      before: { amount: withdrawal.amount, description: withdrawal.description },
      mutate: (tx) => tx.custodyWithdrawal.delete({ where: { id: withdrawalId } }),
    });

    revalidatePath("/custody");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add actions/custody.ts
git commit -m "feat: add custody update/delete actions for deposits and withdrawals"
```

---

### Task 5: Operation reading server action — delete

**Files:**
- Modify: `actions/operation.ts`

- [ ] **Step 1: Append `deleteOperationReadingAction` to `actions/operation.ts`**

```typescript
export async function deleteOperationReadingAction(readingId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.operationsWrite);

    const reading = await prisma.operationReading.findUnique({ where: { id: readingId } });
    if (!reading) return { ok: false, error: "القراءة غير موجودة" };

    await assertCycleOpen(reading.cycleId, { userRole: user.role });

    await withAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entity: "OperationReading",
      entityId: () => readingId,
      before: {
        date: reading.date,
        temperature: reading.temperature,
        humidity: reading.humidity,
        co2: reading.co2,
      },
      mutate: (tx) => tx.operationReading.delete({ where: { id: readingId } }),
    });

    revalidatePath("/operations");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add actions/operation.ts
git commit -m "feat: add deleteOperationReadingAction"
```

---

### Task 6: SaleRowActions component + sales page update

**Files:**
- Create: `app/(app)/sales/sale-row-actions.tsx`
- Modify: `app/(app)/sales/page.tsx`

- [ ] **Step 1: Create `app/(app)/sales/sale-row-actions.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateSaleAction, deleteSaleAction } from "@/actions/sale";

type InventoryOption = { id: string; name: string; unit: string };

type Sale = {
  id: string;
  date: string;
  customerName: string;
  cartons: number;
  pricePerCarton: number;
  paid: number;
  inventoryItemId: string | null;
};

export function SaleRowActions({
  sale,
  inventoryItems,
}: {
  sale: Sale;
  inventoryItems: InventoryOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cartons, setCartons] = useState(String(sale.cartons));
  const [price, setPrice] = useState(String(sale.pricePerCarton));

  const previewTotal =
    cartons && price ? (Number(cartons) * Number(price)).toFixed(2) : null;

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateSaleAction(sale.id, formData);
        if (!result.ok) setError(result.error);
        else {
          setEditOpen(false);
          router.refresh();
        }
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteSaleAction(sale.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>تعديل بيع</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`sale-date-${sale.id}`}>التاريخ</Label>
                  <Input
                    id={`sale-date-${sale.id}`}
                    name="date"
                    type="date"
                    required
                    defaultValue={sale.date}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-customer-${sale.id}`}>اسم العميل</Label>
                  <Input
                    id={`sale-customer-${sale.id}`}
                    name="customerName"
                    type="text"
                    required
                    maxLength={100}
                    defaultValue={sale.customerName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-cartons-${sale.id}`}>عدد الكراتين</Label>
                  <Input
                    id={`sale-cartons-${sale.id}`}
                    name="cartons"
                    type="number"
                    required
                    min="1"
                    step="1"
                    className="tabular-nums"
                    value={cartons}
                    onChange={(e) => setCartons(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-price-${sale.id}`}>سعر الكرتونة (ج.م)</Label>
                  <Input
                    id={`sale-price-${sale.id}`}
                    name="pricePerCarton"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    className="tabular-nums"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-paid-${sale.id}`}>المدفوع (ج.م)</Label>
                  <Input
                    id={`sale-paid-${sale.id}`}
                    name="paid"
                    type="number"
                    min="0"
                    step="0.01"
                    className="tabular-nums"
                    defaultValue={sale.paid}
                  />
                </div>
              </div>
              {previewTotal && (
                <p className="rounded-md bg-secondary px-4 py-2 text-sm">
                  الإجمالي:{" "}
                  <span className="font-bold tabular-nums text-success">{previewTotal} ج.م</span>
                </p>
              )}
              {sale.inventoryItemId && (
                <p className="text-xs text-muted-foreground">
                  ملاحظة: تغيير عدد الكراتين سيحدّث رصيد المخزن تلقائياً.
                </p>
              )}
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
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
              <AlertDialogTitle>حذف البيع</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا البيع؟
                {sale.inventoryItemId && " سيتم استعادة الكمية في المخزن."}
                {" "}هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/(app)/sales/page.tsx`**

Add `auth` import and session check, then add actions column. Replace the full file content:

```tsx
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { getCycleBalances } from "@/lib/inventory";
import { SaleForm } from "./sale-form";
import { PaymentForm } from "./payment-form";
import { SaleRowActions } from "./sale-row-actions";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role === "ADMIN" || role === "ACCOUNTANT";

  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">المبيعات</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [sales, inventoryItems] = await Promise.all([
    prisma.sale.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { date: "desc" },
    }),
    prisma.inventoryItem.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const balances = await getCycleBalances(activeCycle.id);

  const inventoryOptions = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    balance: Number(balances.get(item.id) ?? 0),
  }));

  const inventoryForActions = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
  }));

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalPaid = sales.reduce((sum, s) => sum + Number(s.paid), 0);
  const totalUnpaid = totalRevenue - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المبيعات</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-md border bg-card px-3 py-2">
            الإيرادات:{" "}
            <span className="font-bold tabular-nums text-success">{formatEGP(totalRevenue)}</span>
          </div>
          {totalUnpaid > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
              غير مدفوع:{" "}
              <span className="font-bold tabular-nums text-warning">
                {formatEGP(totalUnpaid)}
              </span>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            بيع جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SaleForm cycleId={activeCycle.id} inventoryItems={inventoryOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">قائمة المبيعات ({formatInt(sales.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد مبيعات مسجلة لهذه الدورة بعد.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">العميل</th>
                    <th className="py-2 font-medium">الكراتين</th>
                    <th className="py-2 font-medium">سعر الكرتونة</th>
                    <th className="py-2 font-medium">الإجمالي</th>
                    <th className="py-2 font-medium">المدفوع</th>
                    <th className="py-2 font-medium">المتبقي</th>
                    <th className="py-2"></th>
                    {canEdit && <th className="py-2 font-medium">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => {
                    const remaining = Number(s.total) - Number(s.paid);
                    const isPaid = remaining <= 0;
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-3 tabular-nums">{formatDate(s.date)}</td>
                        <td className="py-3 font-medium">{s.customerName}</td>
                        <td className="py-3 tabular-nums">{formatInt(s.cartons)}</td>
                        <td className="py-3 tabular-nums">{formatEGP(Number(s.pricePerCarton))}</td>
                        <td className="py-3 tabular-nums font-medium text-success">
                          {formatEGP(Number(s.total))}
                        </td>
                        <td className="py-3 tabular-nums">{formatEGP(Number(s.paid))}</td>
                        <td className="py-3 tabular-nums">
                          {isPaid ? (
                            <Badge variant="success" className="text-xs">مدفوع</Badge>
                          ) : (
                            <span className="font-medium text-warning tabular-nums">
                              {formatEGP(remaining)}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {!isPaid && <PaymentForm saleId={s.id} remaining={remaining} />}
                        </td>
                        {canEdit && (
                          <td className="py-3">
                            <SaleRowActions
                              sale={{
                                id: s.id,
                                date: s.date.toISOString().slice(0, 10),
                                customerName: s.customerName,
                                cartons: s.cartons,
                                pricePerCarton: Number(s.pricePerCarton),
                                paid: Number(s.paid),
                                inventoryItemId: s.inventoryItemId,
                              }}
                              inventoryItems={inventoryForActions}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/sales/sale-row-actions.tsx app/\(app\)/sales/page.tsx
git commit -m "feat: add edit/delete row actions to sales table"
```

---

### Task 7: ExpenseRowActions component + expenses page update

**Files:**
- Create: `app/(app)/expenses/expense-row-actions.tsx`
- Modify: `app/(app)/expenses/page.tsx`

- [ ] **Step 1: Create `app/(app)/expenses/expense-row-actions.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateExpenseAction, deleteExpenseAction } from "@/actions/expense";

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  hasInventory: boolean;
};

export function ExpenseRowActions({ expense }: { expense: Expense }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateExpenseAction(expense.id, formData);
        if (!result.ok) setError(result.error);
        else {
          setEditOpen(false);
          router.refresh();
        }
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteExpenseAction(expense.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل مصروف</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`exp-date-${expense.id}`}>التاريخ</Label>
                  <Input
                    id={`exp-date-${expense.id}`}
                    name="date"
                    type="date"
                    required
                    defaultValue={expense.date}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`exp-desc-${expense.id}`}>الوصف</Label>
                  <Input
                    id={`exp-desc-${expense.id}`}
                    name="description"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={expense.description}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exp-amount-${expense.id}`}>المبلغ (ج.م)</Label>
                  <Input
                    id={`exp-amount-${expense.id}`}
                    name="amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    className="tabular-nums"
                    defaultValue={expense.amount}
                  />
                </div>
              </div>
              {expense.hasInventory && (
                <p className="text-xs text-muted-foreground">
                  ملاحظة: بيانات الصنف المرتبط بالمخزن لا يمكن تعديلها.
                </p>
              )}
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
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
              <AlertDialogTitle>حذف المصروف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المصروف؟
                {expense.hasInventory && " سيتم حذف الصنف المرتبط من المخزن أيضاً."}
                {" "}هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/(app)/expenses/page.tsx`**

Replace the full file content:

```tsx
import { Plus, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { ExpenseRowActions } from "./expense-row-actions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role === "ADMIN" || role === "OPERATOR";

  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">مصاريف التشغيل</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const expenses = await prisma.expense.findMany({
    where: { cycleId: activeCycle.id },
    orderBy: { date: "desc" },
    include: { inventoryItem: true },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مصاريف التشغيل</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          الإجمالي:{" "}
          <span className="font-bold tabular-nums text-destructive">{formatEGP(total)}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            مصروف جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm cycleId={activeCycle.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            قائمة المصاريف ({formatInt(expenses.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد مصاريف مسجلة لهذه الدورة بعد.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الوصف</th>
                    <th className="py-2 font-medium">المبلغ</th>
                    <th className="py-2 font-medium">مخزن</th>
                    {canEdit && <th className="py-2 font-medium">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 tabular-nums">{formatDate(e.date)}</td>
                      <td className="py-3">{e.description}</td>
                      <td className="py-3 tabular-nums text-destructive font-medium">
                        {formatEGP(Number(e.amount))}
                      </td>
                      <td className="py-3">
                        {e.inventoryItem ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <PackageCheck className="h-3 w-3" />
                            {e.inventoryItem.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3">
                          <ExpenseRowActions
                            expense={{
                              id: e.id,
                              date: e.date.toISOString().slice(0, 10),
                              description: e.description,
                              amount: Number(e.amount),
                              hasInventory: !!e.inventoryItem,
                            }}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/expenses/expense-row-actions.tsx app/\(app\)/expenses/page.tsx
git commit -m "feat: add edit/delete row actions to expenses table"
```

---

### Task 8: CustodyRowActions component + custody page update

**Files:**
- Create: `app/(app)/custody/custody-row-actions.tsx`
- Modify: `app/(app)/custody/page.tsx`

- [ ] **Step 1: Create `app/(app)/custody/custody-row-actions.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateDepositAction,
  deleteDepositAction,
  updateWithdrawalAction,
  deleteWithdrawalAction,
} from "@/actions/custody";

type DepositRecord = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
};

type WithdrawalRecord = {
  id: string;
  date: string;
  description: string;
  amount: number;
};

export function DepositRowActions({ deposit }: { deposit: DepositRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateDepositAction(deposit.id, formData);
        if (!result.ok) setError(result.error);
        else { setEditOpen(false); router.refresh(); }
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteDepositAction(deposit.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>تعديل إيداع</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`dep-date-${deposit.id}`}>التاريخ</Label>
                <Input
                  id={`dep-date-${deposit.id}`}
                  name="date"
                  type="date"
                  required
                  defaultValue={deposit.date}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`dep-amount-${deposit.id}`}>المبلغ (ج.م)</Label>
                <Input
                  id={`dep-amount-${deposit.id}`}
                  name="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="tabular-nums"
                  defaultValue={deposit.amount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`dep-notes-${deposit.id}`}>ملاحظات (اختياري)</Label>
                <Input
                  id={`dep-notes-${deposit.id}`}
                  name="notes"
                  type="text"
                  maxLength={200}
                  defaultValue={deposit.notes ?? ""}
                />
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending}
              className="text-destructive hover:text-destructive" title="حذف">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الإيداع</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا الإيداع؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export function WithdrawalRowActions({ withdrawal }: { withdrawal: WithdrawalRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateWithdrawalAction(withdrawal.id, formData);
        if (!result.ok) setError(result.error);
        else { setEditOpen(false); router.refresh(); }
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteWithdrawalAction(withdrawal.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>تعديل صرفية</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`wd-date-${withdrawal.id}`}>التاريخ</Label>
                <Input
                  id={`wd-date-${withdrawal.id}`}
                  name="date"
                  type="date"
                  required
                  defaultValue={withdrawal.date}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`wd-amount-${withdrawal.id}`}>المبلغ (ج.م)</Label>
                <Input
                  id={`wd-amount-${withdrawal.id}`}
                  name="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="tabular-nums"
                  defaultValue={withdrawal.amount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`wd-desc-${withdrawal.id}`}>الوصف</Label>
                <Input
                  id={`wd-desc-${withdrawal.id}`}
                  name="description"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={withdrawal.description}
                />
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending}
              className="text-destructive hover:text-destructive" title="حذف">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الصرفية</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الصرفية؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/(app)/custody/page.tsx`**

Replace the full file content:

```tsx
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCustodyBalance, CUSTODY_LOW_THRESHOLD } from "@/lib/custody";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DepositForm, WithdrawalForm } from "./custody-form";
import { DepositRowActions, WithdrawalRowActions } from "./custody-row-actions";

export const dynamic = "force-dynamic";

export default async function CustodyPage() {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role === "ADMIN" || role === "ACCOUNTANT";

  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">العهدة</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [balance, deposits, withdrawals] = await Promise.all([
    getCustodyBalance(),
    prisma.custodyDeposit.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { date: "desc" },
    }),
    prisma.custodyWithdrawal.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const isLow = balance < CUSTODY_LOW_THRESHOLD;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">العهدة</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <Card className={cn("border-2", isLow ? "border-warning" : "border-success")}>
          <CardContent className="flex items-center gap-3 p-4">
            <Wallet className={cn("h-6 w-6", isLow ? "text-warning" : "text-success")} />
            <div>
              <p className="text-xs text-muted-foreground">الرصيد الإجمالي</p>
              <p className={cn("text-xl font-bold tabular-nums", isLow ? "text-warning" : "text-success")}>
                {formatEGP(balance)}
              </p>
            </div>
            {isLow && <Badge variant="warning" className="mr-2 text-xs">رصيد منخفض</Badge>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-success">
              <ArrowDownCircle className="h-4 w-4" />
              إيداع في العهدة
            </CardTitle>
          </CardHeader>
          <CardContent><DepositForm cycleId={activeCycle.id} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <ArrowUpCircle className="h-4 w-4" />
              صرف من العهدة
            </CardTitle>
          </CardHeader>
          <CardContent><WithdrawalForm cycleId={activeCycle.id} balance={balance} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownCircle className="h-4 w-4 text-success" />
              الإيداعات ({formatInt(deposits.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد إيداعات.</p>
            ) : (
              <div className="space-y-2">
                {deposits.map((d) => (
                  <div key={d.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <p className="tabular-nums text-muted-foreground text-xs">{formatDate(d.date)}</p>
                      {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums text-success">
                        +{formatEGP(Number(d.amount))}
                      </span>
                      {canEdit && (
                        <DepositRowActions
                          deposit={{
                            id: d.id,
                            date: d.date.toISOString().slice(0, 10),
                            amount: Number(d.amount),
                            notes: d.notes,
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpCircle className="h-4 w-4 text-destructive" />
              الصرفيات ({formatInt(withdrawals.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد صرفيات.</p>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((w) => (
                  <div key={w.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <p className="tabular-nums text-muted-foreground text-xs">{formatDate(w.date)}</p>
                      <p className="text-xs">{w.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums text-destructive">
                        -{formatEGP(Number(w.amount))}
                      </span>
                      {canEdit && (
                        <WithdrawalRowActions
                          withdrawal={{
                            id: w.id,
                            date: w.date.toISOString().slice(0, 10),
                            description: w.description,
                            amount: Number(w.amount),
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/custody/custody-row-actions.tsx app/\(app\)/custody/page.tsx
git commit -m "feat: add edit/delete row actions to custody deposits and withdrawals"
```

---

### Task 9: ReadingRowActions component + operations page update

**Files:**
- Create: `app/(app)/operations/reading-row-actions.tsx`
- Modify: `app/(app)/operations/page.tsx`

- [ ] **Step 1: Create `app/(app)/operations/reading-row-actions.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateOperationReadingAction, deleteOperationReadingAction } from "@/actions/operation";

const CLEANLINESS_OPTIONS = [
  { value: "EXCELLENT", label: "ممتاز" },
  { value: "GOOD", label: "جيد" },
  { value: "ACCEPTABLE", label: "مقبول" },
  { value: "POOR", label: "سيء" },
];

type Reading = {
  id: string;
  dayNumber: number;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  cleanliness: string | null;
  notes: string | null;
};

export function ReadingRowActions({ reading }: { reading: Reading }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateOperationReadingAction(reading.id, formData);
        if (!result.ok) setError(result.error);
        else { setEditOpen(false); router.refresh(); }
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteOperationReadingAction(reading.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>تعديل قراءة اليوم {reading.dayNumber}</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`r-temp-${reading.id}`}>درجة الحرارة (°م)</Label>
                  <Input
                    id={`r-temp-${reading.id}`}
                    name="temperature"
                    type="number"
                    step="0.1"
                    min="-50"
                    max="100"
                    className="tabular-nums"
                    defaultValue={reading.temperature ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`r-hum-${reading.id}`}>الرطوبة (%)</Label>
                  <Input
                    id={`r-hum-${reading.id}`}
                    name="humidity"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="tabular-nums"
                    defaultValue={reading.humidity ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`r-co2-${reading.id}`}>CO₂ (ppm)</Label>
                  <Input
                    id={`r-co2-${reading.id}`}
                    name="co2"
                    type="number"
                    step="1"
                    min="0"
                    max="9999"
                    className="tabular-nums"
                    defaultValue={reading.co2 ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`r-clean-${reading.id}`}>النظافة</Label>
                  <select
                    id={`r-clean-${reading.id}`}
                    name="cleanliness"
                    defaultValue={reading.cleanliness ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">— اختر —</option>
                    {CLEANLINESS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor={`r-notes-${reading.id}`}>ملاحظات</Label>
                  <Input
                    id={`r-notes-${reading.id}`}
                    name="notes"
                    type="text"
                    maxLength={500}
                    defaultValue={reading.notes ?? ""}
                  />
                </div>
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending}
              className="text-destructive hover:text-destructive" title="حذف">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف القراءة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف قراءة اليوم {reading.dayNumber}؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/(app)/operations/page.tsx`**

Replace the full file content:

```tsx
import { Plus, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReadingForm } from "./reading-form";
import { ReadingRowActions } from "./reading-row-actions";

export const dynamic = "force-dynamic";

const CLEANLINESS_LABEL: Record<string, string> = {
  EXCELLENT: "ممتاز",
  GOOD: "جيد",
  ACCEPTABLE: "مقبول",
  POOR: "سيء",
};

const CLEANLINESS_VARIANT: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  EXCELLENT: "success",
  GOOD: "secondary",
  ACCEPTABLE: "warning",
  POOR: "destructive",
};

const TEMP_MIN = 16, TEMP_MAX = 28;
const HUMIDITY_MIN = 80, HUMIDITY_MAX = 95;
const CO2_MAX = 2000;

function isTempAlert(v: number | null) { return v !== null && (v < TEMP_MIN || v > TEMP_MAX); }
function isHumidityAlert(v: number | null) { return v !== null && (v < HUMIDITY_MIN || v > HUMIDITY_MAX); }
function isCo2Alert(v: number | null) { return v !== null && v > CO2_MAX; }

export default async function OperationsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role === "ADMIN" || role === "OPERATOR";

  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">جدول التشغيل</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const readings = await prisma.operationReading.findMany({
    where: { cycleId: activeCycle.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">جدول التشغيل</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 text-left">
          <p>نطاق آمن: حرارة {TEMP_MIN}–{TEMP_MAX}°م · رطوبة {HUMIDITY_MIN}–{HUMIDITY_MAX}٪ · CO₂ &lt;{CO2_MAX}ppm</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            تسجيل قراءة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent><ReadingForm cycleId={activeCycle.id} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل القراءات ({formatInt(readings.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          {readings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد قراءات مسجلة بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">اليوم</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الحرارة (°م)</th>
                    <th className="py-2 font-medium">الرطوبة (%)</th>
                    <th className="py-2 font-medium">CO₂ (ppm)</th>
                    <th className="py-2 font-medium">النظافة</th>
                    <th className="py-2 font-medium">ملاحظات</th>
                    {canEdit && <th className="py-2 font-medium">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => {
                    const tempAlert = isTempAlert(r.temperature ? Number(r.temperature) : null);
                    const humidAlert = isHumidityAlert(r.humidity ? Number(r.humidity) : null);
                    const co2Alert = isCo2Alert(r.co2);
                    const hasAlert = tempAlert || humidAlert || co2Alert;
                    return (
                      <tr key={r.id} className={cn("border-b last:border-0 hover:bg-muted/40", hasAlert && "bg-warning/5")}>
                        <td className="py-3 tabular-nums font-medium">
                          <span className="flex items-center gap-1">
                            {hasAlert && <AlertTriangle className="h-3 w-3 text-warning" />}
                            {formatInt(r.dayNumber)}
                          </span>
                        </td>
                        <td className="py-3 tabular-nums">{formatDate(r.date)}</td>
                        <td className={cn("py-3 tabular-nums", tempAlert && "font-medium text-warning")}>
                          {r.temperature !== null ? Number(r.temperature).toFixed(1) : "—"}
                        </td>
                        <td className={cn("py-3 tabular-nums", humidAlert && "font-medium text-warning")}>
                          {r.humidity !== null ? Number(r.humidity).toFixed(1) : "—"}
                        </td>
                        <td className={cn("py-3 tabular-nums", co2Alert && "font-medium text-warning")}>
                          {r.co2 !== null ? formatInt(r.co2) : "—"}
                        </td>
                        <td className="py-3">
                          {r.cleanliness ? (
                            <Badge variant={CLEANLINESS_VARIANT[r.cleanliness] ?? "secondary"} className="text-xs">
                              {CLEANLINESS_LABEL[r.cleanliness] ?? r.cleanliness}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 max-w-xs truncate text-muted-foreground">{r.notes ?? "—"}</td>
                        {canEdit && (
                          <td className="py-3">
                            <ReadingRowActions
                              reading={{
                                id: r.id,
                                dayNumber: r.dayNumber,
                                temperature: r.temperature ? Number(r.temperature) : null,
                                humidity: r.humidity ? Number(r.humidity) : null,
                                co2: r.co2,
                                cleanliness: r.cleanliness,
                                notes: r.notes,
                              }}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/operations/reading-row-actions.tsx app/\(app\)/operations/page.tsx
git commit -m "feat: add edit/delete row actions to operation readings table"
```

---

### Task 10: Final build verification

- [ ] **Step 1: Run full build**

```bash
cd "c:/Users/Momen/OneDrive/my code/my Saas project/نظام إدارة صوبة الماشروم"
npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 2: Deploy to Vercel**

```bash
git push origin master
```

Then verify on the live site: create a cycle, add a sale/expense/deposit/withdrawal/reading, and confirm edit + delete buttons appear and work correctly.
