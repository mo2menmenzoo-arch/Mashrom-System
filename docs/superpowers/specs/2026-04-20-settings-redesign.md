# Settings Page Redesign — Design Spec
Date: 2026-04-20

## Overview
Redesign `/settings` from a simple 2-card hub into a full professional settings experience with sidebar navigation and 6 content sections.

## Layout
- **Sidebar navigation** (fixed, right-aligned for RTL): lists all 6 sections with icons; active section is highlighted in blue.
- **Content area**: shows one section at a time as stacked cards with section headers (icon + title + description) and form fields inside.
- Fully responsive: sidebar collapses on mobile (tabs or hamburger).
- Existing `/settings/users` and `/settings/notifications` sub-pages stay as-is but are now accessible via the sidebar.

## Sections & Content

### 1. الحساب (Account)
Two cards stacked vertically:
- **المعلومات الشخصية**: Name + Email fields in a 2-column grid. Save / Cancel buttons.
- **تغيير كلمة المرور**: Current password + New password + Confirm password in a 3-column grid. "Update Password" button.

### 2. إعدادات الصوبة (Greenhouse Defaults)
One card:
- Default Target Temperature (°C) — number input, default 22
- Default Target Humidity (%) — number input, default 85
- Default Cycle Duration (days) — number input, default 60
- Save button.

### 3. المالية (Financial)
One card:
- Default Currency — select (EGP / USD), default EGP
- Tax Rate % — number input, default 0
- Save button.

### 4. النظام والبيانات (System & Data)
One card with two subsections:
- **المظهر**: Dark/Light theme toggle row.
- **تصدير البيانات**: Two export buttons — "تصدير CSV" and "تصدير Excel", each triggers a download.

### 5. المستخدمون (User Management)
Link/redirect to existing `/settings/users` page. Shown inline in sidebar with user count badge.

### 6. الإشعارات (Notifications)
Link/redirect to existing `/settings/notifications` page.

## Behaviour & State

### Backend vs Local State
- Sections 1 (Account): calls real server actions (update name/email, update password) — connect to existing user model.
- Sections 2 (Greenhouse) + 3 (Financial): **local state only** for now (no DB table yet). Values persist in `localStorage` under keys `gh_defaults` and `fin_defaults`.
- Section 4 Theme toggle: uses `next-themes` if already in project, otherwise `localStorage` with a class on `<html>`.
- Section 4 Export: calls a new server action `exportAllData()` that streams a CSV/Excel file.

### UX Feedback
- After any Save: show a green toast "تم الحفظ بنجاح" for 3 seconds (use a simple state-based banner, no new toast library).
- On error: red toast "حدث خطأ، حاول مرة أخرى".
- Cancel button: outlined red border (not filled) to distinguish from Save.
- Input focus: blue `ring-2 ring-blue-500` border.
- Card/button hover: subtle background shift (`hover:bg-muted/50`).

## Architecture

### Files to create
| File | Purpose |
|------|---------|
| `app/(app)/settings/page.tsx` | New sidebar shell — replaces current hub page |
| `app/(app)/settings/settings-sidebar.tsx` | Client component: sidebar nav with active state |
| `app/(app)/settings/account/page.tsx` | Account section (name, email, password) |
| `app/(app)/settings/greenhouse/page.tsx` | Greenhouse defaults (localStorage) |
| `app/(app)/settings/financial/page.tsx` | Financial defaults (localStorage) |
| `app/(app)/settings/system/page.tsx` | Theme toggle + export buttons |
| `actions/settings.ts` | `updateAccountAction`, `updatePasswordAction`, `exportAllDataAction` |

### Files to keep unchanged
- `app/(app)/settings/users/` — untouched
- `app/(app)/settings/notifications/` — untouched

### Routing strategy
- `/settings` → redirects to `/settings/account`
- Each section is a real Next.js route so the URL reflects the active section
- Sidebar highlights based on `usePathname()`

## Existing UI Components Available
- `Card`, `CardHeader`, `CardContent` from `components/ui/card.tsx`
- `Button` from `components/ui/button.tsx`
- `Input` from `components/ui/input.tsx`
- `Label` from `components/ui/label.tsx`
- `Dialog`, `AlertDialog` already exist

No new shadcn components needed.

## Access Control
- All `/settings/*` pages redirect to `/dashboard` if `role !== "ADMIN"` (same as current).
