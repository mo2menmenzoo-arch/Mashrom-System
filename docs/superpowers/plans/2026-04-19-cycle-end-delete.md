# Cycle End & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "إنهاء" (end) and "حذف" (delete) action buttons for ADMIN on the cycles list page, each confirmed with an AlertDialog.

**Architecture:** Three-touch change — add `deleteCycleAction` server action, add `CycleActions` client component with two AlertDialogs, update the cycles page query and table to wire them together. `closeCycleAction` already exists and requires no changes.

**Tech Stack:** Next.js 15 server actions, Prisma, shadcn/ui AlertDialog, `useTransition`, `useRouter`

---

### Task 1: Add shadcn/ui AlertDialog component

**Files:**
- Create: `components/ui/alert-dialog.tsx`

- [ ] **Step 1: Add the AlertDialog component via shadcn CLI**

Run from the project root:
```bash
npx shadcn@latest add alert-dialog
```
Expected output: `✔ Done — installed alert-dialog component`.
The file `components/ui/alert-dialog.tsx` should now exist.

- [ ] **Step 2: Verify the file was created**

```bash
ls components/ui/
```
Expected: `alert-dialog.tsx` appears in the list.

- [ ] **Step 3: Commit**

```bash
git add components/ui/alert-dialog.tsx
git commit -m "feat: add shadcn alert-dialog component"
```

---

### Task 2: Add `deleteCycleAction` server action

**Files:**
- Modify: `actions/cycle.ts`

- [ ] **Step 1: Open `actions/cycle.ts` and append the new action at the bottom**

Add this function after the existing `closeCycleAction`:

```ts
export async function deleteCycleAction(cycleId: string): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.cycleManage);

    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        _count: {
          select: {
            sales: true,
            expenses: true,
            readings: true,
            deposits: true,
            withdrawals: true,
            inventory: true,
          },
        },
      },
    });
    if (!cycle) return { ok: false, error: "الدورة غير موجودة" };

    const total =
      cycle._count.sales +
      cycle._count.expenses +
      cycle._count.readings +
      cycle._count.deposits +
      cycle._count.withdrawals +
      cycle._count.inventory;

    if (total > 0) {
      return { ok: false, error: "لا يمكن حذف دورة تحتوي على بيانات" };
    }

    await prisma.cycle.delete({ where: { id: cycleId } });

    revalidatePath("/cycles");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
```

Note: `revalidatePath`, `prisma`, `requireRole`, `perms`, and `ActionResult` are already imported/defined at the top of the file.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add actions/cycle.ts
git commit -m "feat: add deleteCycleAction server action"
```

---

### Task 3: Create `CycleActions` client component

**Files:**
- Create: `app/(app)/cycles/cycle-actions.tsx`

- [ ] **Step 1: Create the file with this content**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { closeCycleAction, deleteCycleAction } from "@/actions/cycle";

export function CycleActions({
  cycleId,
  status,
  hasData,
}: {
  cycleId: string;
  status: string;
  hasData: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const result = await closeCycleAction(cycleId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCycleAction(cycleId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={pending || status === "ENDED"}
            >
              إنهاء
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>إنهاء الدورة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من إنهاء هذه الدورة؟ لن تتمكن من إضافة بيانات جديدة إليها بعد ذلك.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose}>
                تأكيد الإنهاء
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending || hasData}
            >
              حذف
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الدورة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الدورة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
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
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/cycles/cycle-actions.tsx
git commit -m "feat: add CycleActions client component with AlertDialog"
```

---

### Task 4: Update cycles page query and table

**Files:**
- Modify: `app/(app)/cycles/page.tsx`

- [ ] **Step 1: Extend the `_count` query to include all relations**

Find the `prisma.cycle.findMany` call (line ~28). Replace the `include` block:

```ts
  const cycles = await prisma.cycle.findMany({
    orderBy: { number: "desc" },
    include: {
      _count: {
        select: {
          sales: true,
          expenses: true,
          readings: true,
          deposits: true,
          withdrawals: true,
          inventory: true,
        },
      },
    },
  });
```

- [ ] **Step 2: Add the `CycleActions` import at the top of the file**

Add after the existing imports:
```ts
import { CycleActions } from "./cycle-actions";
```

- [ ] **Step 3: Update the table row to render actions**

Find the last `<td>` in the table row (the one with `تفاصيل ←`). Replace the entire `<tr>` body so it has two cells at the end — keep the details link and add the actions:

Replace:
```tsx
                      <td className="py-3 text-left">
                        <Link
                          href={`/cycles/${c.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          تفاصيل ←
                        </Link>
                      </td>
```

With:
```tsx
                      <td className="py-3 text-left">
                        <Link
                          href={`/cycles/${c.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          تفاصيل ←
                        </Link>
                      </td>
                      {isAdmin && (
                        <td className="py-3">
                          <CycleActions
                            cycleId={c.id}
                            status={c.status}
                            hasData={
                              c._count.sales +
                                c._count.expenses +
                                c._count.readings +
                                c._count.deposits +
                                c._count.withdrawals +
                                c._count.inventory >
                              0
                            }
                          />
                        </td>
                      )}
```

Also add a matching header cell — find the `<th className="py-2"></th>` (the empty last header) and replace with:
```tsx
                    <th className="py-2 font-medium">{isAdmin ? "إجراءات" : ""}</th>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Start dev server and manually test**

```bash
npm run dev
```

Open `http://localhost:3000/cycles` as ADMIN and verify:
- "إنهاء" button appears per row, disabled for ENDED cycles
- "حذف" button appears per row, disabled for cycles with data
- Clicking "إنهاء" opens AlertDialog; confirming changes status to ENDED and refreshes
- Clicking "حذف" on an empty cycle opens AlertDialog; confirming deletes the row
- Errors from the server show in red below the buttons
- Non-admin users see no action buttons

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/cycles/page.tsx
git commit -m "feat: wire cycle end/delete actions into cycles page"
```
