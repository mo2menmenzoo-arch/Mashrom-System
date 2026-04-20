# Excel/PDF Export & DB-Backed Settings — Design Spec
Date: 2026-04-20

## Overview
Two independent features:
1. **Excel & PDF export** — replace the broken Excel button and add a PDF print option in the System & Data settings page.
2. **DB-backed settings** — migrate greenhouse defaults, financial defaults, and partner shares from `localStorage` to PostgreSQL via Prisma, using an Organization singleton pattern.

---

## Feature 1: Excel & PDF Export

### Current state
- `exportAllDataAction` in `actions/settings.ts` returns a CSV string.
- `system/page.tsx` has two buttons: "تصدير CSV" (works) and "تصدير Excel" (calls the same CSV action — bug).
- No PDF export exists.

### Design

#### Excel export
- Add `xlsx` (SheetJS) as a dependency.
- New server action `exportExcelAction()` in `actions/settings.ts`:
  - Restricted to ADMIN role.
  - Queries the same five datasets as CSV: sales, expenses, custodyDeposits, custodyWithdrawals, inventoryItems.
  - Builds one workbook with five named worksheets (مبيعات, مصروفات, إيداعات, صرفيات, مخزن).
  - Returns `{ success: true, base64: string }` — the workbook encoded as base64.
- Client handler `handleExportExcel()` in `system/page.tsx`:
  - Calls `exportExcelAction()`.
  - Decodes base64 → `Uint8Array` → `Blob` with type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
  - Triggers download as `mushroom-data-YYYY-MM-DD.xlsx`.

#### PDF export (browser print dialog)
- Pure client-side — no server action needed.
- Handler `handlePrintPDF()` in `system/page.tsx`:
  - Opens a new window (`window.open`).
  - Writes an HTML document with:
    - RTL `<html dir="rtl">`, Arabic font via Google Fonts (Cairo or Tajawal).
    - Print-specific CSS: `@media print { body { margin: 0 } }`, page breaks between tables.
    - Five `<table>` elements matching the five data categories — data fetched from a lightweight client call or pre-fetched via a server action `getPrintDataAction()`.
    - A `<script>` tag that calls `window.print()` then `window.close()` after print.
  - The new window opens, the print dialog fires automatically.
- `getPrintDataAction()` returns the same datasets as the CSV action but as plain JS objects (no CSV encoding).

#### UI changes in `system/page.tsx`
- "تصدير CSV" button → unchanged, calls existing `exportAllDataAction`.
- "تصدير Excel" button → calls new `handleExportExcel`.
- Add third button "طباعة / PDF" → calls `handlePrintPDF`.
- All three share a single `exporting` state so they disable together during any active export.

---

## Feature 2: DB-Backed Settings

### Schema additions (Prisma)

#### `Organization`
```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String   @default("الصوبة الرئيسية")
  createdAt   DateTime @default(now())

  users                User[]
  greenhouseSettings   GreenhouseSettings?
  financialSettings    FinancialSettings?
  partners             Partner[]
}
```

#### `GreenhouseSettings`
```prisma
model GreenhouseSettings {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id])
  temperature    Float        @default(22)
  humidity       Float        @default(85)
  cycleDuration  Int          @default(60)
  updatedAt      DateTime     @updatedAt
}
```

#### `FinancialSettings`
```prisma
model FinancialSettings {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id])
  currency       String       @default("EGP")
  taxRate        Float        @default(0)
  updatedAt      DateTime     @updatedAt
}
```

#### `Partner`
```prisma
model Partner {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  sharePercent   Float
  position       Int          @default(0)
  updatedAt      DateTime     @updatedAt
}
```

#### `UserPreferences`
```prisma
model UserPreferences {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme     String   @default("light")
  updatedAt DateTime @updatedAt
}
```

#### `User` model addition
```prisma
organizationId String?
organization   Organization? @relation(fields: [organizationId], references: [id])
preferences    UserPreferences?
```

### Migration strategy
1. Prisma migration creates all new tables.
2. A seed/migration script (inline in the SQL migration or a separate seed file):
   - Inserts one `Organization` row with `id = "default-org"`.
   - Updates all existing `User` rows: `SET organizationId = 'default-org'`.
3. On application boot, `getOrgSettingsAction` uses `upsert` so the settings rows are auto-created on first read if missing.

### Server actions (in `actions/settings.ts`)

| Action | Role required | What it does |
|--------|--------------|--------------|
| `getOrgSettingsAction()` | Any authenticated | Returns org greenhouse + financial + partners via upsert-on-first-read |
| `updateGreenhouseSettingsAction(formData)` | ADMIN | Upserts `GreenhouseSettings` for default org |
| `updateFinancialSettingsAction(formData)` | ADMIN | Upserts `FinancialSettings` for default org |
| `updatePartnersAction(partners[])` | ADMIN | Deletes existing partners for org, inserts new list |
| `updateThemePreferenceAction(theme)` | Any authenticated | Upserts `UserPreferences.theme` for current user |

All actions: validate with zod, call `revalidatePath` on the relevant settings route.

### Page architecture changes

#### `greenhouse/page.tsx`
- Becomes a **server component** (remove `"use client"`).
- Calls `getOrgSettingsAction()` to load initial values as props.
- Renders a new `GreenhouseForm` client component that receives initial values and submits via `updateGreenhouseSettingsAction`.
- Remove all localStorage reads/writes.

#### `financial/page.tsx`
- Same pattern as greenhouse: server component + `FinancialForm` client component.

#### `partners/partners-form.tsx`
- `PartnerSharesForm` receives initial partners array as a prop (loaded by server parent).
- On save, calls `updatePartnersAction` instead of `localStorage.setItem`.
- Remove all localStorage reads/writes.

#### `system/page.tsx`
- Theme toggle: on toggle, calls `updateThemePreferenceAction(theme)` in addition to updating the DOM class. On initial load, reads from `UserPreferences` via a small server component wrapper (or a `useEffect` call to a lightweight action).
- Export buttons: updated as described in Feature 1.

### Access control
- `updateGreenhouseSettingsAction`, `updateFinancialSettingsAction`, `updatePartnersAction` → ADMIN only.
- `updateThemePreferenceAction` → any authenticated user.
- `getOrgSettingsAction` → any authenticated user (settings are read-only for non-admins).

---

## Files to create / modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Organization, GreenhouseSettings, FinancialSettings, Partner, UserPreferences; add organizationId + preferences to User |
| `actions/settings.ts` | Add getOrgSettingsAction, updateGreenhouseSettingsAction, updateFinancialSettingsAction, updatePartnersAction, updateThemePreferenceAction, exportExcelAction, getPrintDataAction |
| `app/(app)/settings/greenhouse/page.tsx` | Convert to server component, extract GreenhouseForm client component |
| `app/(app)/settings/financial/page.tsx` | Convert to server component, extract FinancialForm client component |
| `app/(app)/settings/partners/partners-form.tsx` | Remove localStorage, accept initialPartners prop, call updatePartnersAction |
| `app/(app)/settings/partners/page.tsx` | Load partners from DB, pass to PartnerSharesForm |
| `app/(app)/settings/system/page.tsx` | Fix Excel button, add PDF button, integrate theme DB sync |

## Dependencies to add
- `xlsx` (SheetJS) — Excel generation on the server

## Out of scope
- Multi-organization support (schema is future-proof but all queries use the default org)
- Notification preferences in UserPreferences (theme only for now)
- Language preference
