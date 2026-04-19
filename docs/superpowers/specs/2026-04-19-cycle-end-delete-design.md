# Cycle End & Delete — Design Spec
Date: 2026-04-19

## Overview

Add "إنهاء" (end/close) and "حذف" (delete) actions for cycles on the `/cycles` page, visible and usable only by ADMIN. Confirmation uses shadcn/ui AlertDialog. Pattern follows the existing `users-table.tsx` client-action approach.

## Files

### New: `app/(app)/cycles/cycle-actions.tsx`

Client component `CycleActions` with props:
```ts
{ cycleId: string; status: string; hasData: boolean }
```

- Renders two AlertDialog-triggered buttons in a flex row
- **"إنهاء الدورة"**: disabled if `status === "ENDED"`. On confirm → calls `closeCycleAction(cycleId)`. On success → `router.refresh()`. On failure → shows error below buttons.
- **"حذف الدورة"**: disabled if `hasData`. Button styled with destructive variant. On confirm → calls `deleteCycleAction(cycleId)`. On success → `router.refresh()`. On failure → shows error.
- Both use `useTransition` for pending state. Only one action can run at a time.

### Modified: `actions/cycle.ts`

Add `deleteCycleAction(cycleId: string): Promise<ActionResult>`:
- `requireRole(perms.cycleManage)`
- Fetch cycle; 404 if missing
- Count all relations: `sales`, `expenses`, `readings`, `deposits`, `withdrawals`, `inventory`
- If any count > 0 → return error "لا يمكن حذف دورة تحتوي على بيانات"
- Hard delete via `prisma.cycle.delete`
- `revalidatePath("/cycles")` + `revalidatePath("/dashboard")`

### Modified: `app/(app)/cycles/page.tsx`

- Extend `_count` query to include `deposits`, `withdrawals`, `inventory`
- Compute `hasData = (c._count.sales + c._count.expenses + c._count.readings + c._count.deposits + c._count.withdrawals + c._count.inventory) > 0`
- Render `<CycleActions cycleId={c.id} status={c.status} hasData={hasData} />` in the last `<td>`, wrapped in `{isAdmin && ...}`
- Keep existing "تفاصيل ←" link, move it to a separate column or combine

## Constraints

- `closeCycleAction` already exists and is correct — no changes needed to it
- Delete is a hard delete (no soft delete); the server action is the authoritative guard
- `hasData` in UI is a UX hint only; server always re-checks before deleting
- No audit log entry needed for delete (no `withAudit` wrapper needed, but can add if desired — out of scope)
- AlertDialog text must be Arabic, RTL-compatible
