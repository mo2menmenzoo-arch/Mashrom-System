# Spec: Multi-Greenhouse Support + Founding Expenses + Custody Categorization

**Date:** 2026-04-24  
**Status:** Draft

---

## Overview

Three interconnected features:
1. **Multi-greenhouse support** — one organization manages multiple independent greenhouses, each with its own cycles and settings.
2. **Founding expenses** — one-time capital expenses per greenhouse, displayed separately in reports as "رأس مال مبدئي".
3. **Custody withdrawal categorization** — withdrawals are tagged as operating or founding; operating withdrawals auto-create an `Expense` record in the active cycle.

---

## 1. Database Schema Changes

### New: `Greenhouse` model
```prisma
model Greenhouse {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  number         Int
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  cycles           Cycle[]
  foundingExpenses FoundingExpense[]
  settings         GreenhouseSettings?

  @@unique([organizationId, number])
  @@index([organizationId])
}
```

### Modify: `Cycle`
- Add `greenhouseId String` (required, FK → `Greenhouse`)
- Every cycle must belong to a greenhouse.

### Modify: `GreenhouseSettings`
- Change FK from `organizationId` to `greenhouseId` (one set of settings per greenhouse, not per org).
- Fields stay the same: `temperature`, `humidity`, `cycleDuration`.

### New: `FoundingExpense` model
```prisma
model FoundingExpense {
  id           String     @id @default(cuid())
  greenhouseId String
  greenhouse   Greenhouse @relation(fields: [greenhouseId], references: [id])
  date         DateTime
  amount       Decimal    @db.Decimal(12, 2)
  description  String
  notes        String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  custodyWithdrawalId String? @unique

  @@index([greenhouseId, date])
}
```

### New enum: `WithdrawalCategory`
```prisma
enum WithdrawalCategory {
  OPERATING
  FOUNDING
}
```

### Modify: `CustodyWithdrawal`
- Add `category WithdrawalCategory @default(OPERATING)`
- Add `expenseId String? @unique` — FK → `Expense` (set when category = OPERATING)
- Add `foundingExpenseId String? @unique` — FK → `FoundingExpense` (set when category = FOUNDING)

### Modify: `Organization`
- Remove `greenhouseSettings` relation (moved to `Greenhouse`).
- Add `greenhouses Greenhouse[]` relation.

---

## 2. Business Logic

### Custody Withdrawal — Operating
When a withdrawal is created with `category = OPERATING`:
1. Create `CustodyWithdrawal` record.
2. Auto-create `Expense` in the active cycle with same `date`, `amount`, `description`.
3. Store `expenseId` on the withdrawal for cascading deletes.
4. If the withdrawal is deleted, the linked `Expense` is also deleted.

### Custody Withdrawal — Founding
When a withdrawal is created with `category = FOUNDING`:
1. Create `CustodyWithdrawal` record.
2. Auto-create `FoundingExpense` linked to the active greenhouse.
3. Store `foundingExpenseId` on the withdrawal.
4. If the withdrawal is deleted, the linked `FoundingExpense` is also deleted.

### Greenhouse creation
- Admin creates a greenhouse with a name and number.
- Upon creation, a `GreenhouseSettings` record is auto-created with defaults.
- The founding expenses section becomes immediately accessible from the greenhouse settings page.

### Cycle creation
- Cycle creation form now requires selecting a greenhouse first.
- `greenhouseId` is required; validation rejects cycles without one.

---

## 3. Pages & UI

### `/settings/greenhouses` (new)
- List of all greenhouses with name, number, cycle count.
- "إضافة صوبة جديدة" button (admin only) with fields: name, number.
- Each greenhouse card links to its detail/settings page.

### `/settings/greenhouses/[id]` (new)
- Greenhouse settings: temperature, humidity, cycle duration (same form as current `GreenhouseForm` but per-greenhouse).
- Founding expenses section below settings:
  - Table of existing founding expenses (date, amount, description, notes).
  - Add new founding expense form (date, amount, description, notes).
  - Edit/delete row actions.

### `/custody` — withdrawal form changes
- Add radio/select field "نوع الصرف": مصاريف تشغيل / مصاريف تأسيس.
- Default: مصاريف تشغيل.
- Both options create a `CustodyWithdrawal`; the auto-linking happens server-side.
- The withdrawal list shows a badge indicating the category.

### `/cycles` — cycle creation & listing changes
- Cycle list shows which greenhouse each cycle belongs to.
- Cycle creation form adds a "الصوبة" select (required) listing all greenhouses.
- Filter/tabs at top to view cycles by greenhouse or all.

### `/reports` — financial reports changes
- Add greenhouse selector at top: "كل الصوب" (aggregated) or pick one.
- **Per-greenhouse view:**
  - Existing KPI cards (revenue, expenses, net profit) scoped to that greenhouse's cycles.
  - New section "رأس مال مبدئي" showing founding expenses total + itemized list.
  - Founding expenses are displayed separately and do NOT reduce net profit.
- **Aggregated view ("كل الصوب"):**
  - KPI cards summed across all greenhouses.
  - Net profit = sum of all greenhouses' net profits.
  - Founding expenses shown in a separate summary card per greenhouse.

---

## 4. Migration Strategy

1. Add `Greenhouse` table with a seed record ("الصوبة الرئيسية", number=1) linked to the existing organization.
2. Add `greenhouseId` column to `Cycle` with a default pointing to that seed greenhouse, then make it required.
3. Migrate `GreenhouseSettings` FK from `organizationId` to `greenhouseId`.
4. Add `category`, `expenseId`, `foundingExpenseId` to `CustodyWithdrawal` (nullable, defaulting to OPERATING).
5. Add `FoundingExpense` table.

Existing data is preserved — all current cycles map to greenhouse #1 automatically.

---

## 5. Roles & Permissions

- Greenhouse creation/deletion: ADMIN only.
- Founding expenses CRUD: ADMIN and ACCOUNTANT.
- Custody withdrawal category: ADMIN and ACCOUNTANT (same as current withdrawal permissions).
- Greenhouse settings: ADMIN only.
- Reports (all views): all roles (read-only).

---

## 6. Out of Scope

- Per-greenhouse user access control (all users in the org see all greenhouses).
- Greenhouse archiving/deactivation.
- Moving cycles between greenhouses after creation.
