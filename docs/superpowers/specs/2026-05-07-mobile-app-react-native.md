---
name: Mobile App — React Native / Expo
description: Convert the mushroom greenhouse web app (Next.js) into a full-featured Android mobile app using Expo, with thin REST API routes added to the existing Vercel backend.
type: project
---

# Mobile App — React Native / Expo

## Overview

Convert the existing Next.js mushroom greenhouse management system into a full-featured Android mobile app with 100% feature parity. The web app has no REST API — data is fetched via direct Prisma calls and Server Actions. We will add a `/api/mobile/` layer to the existing Next.js app on Vercel, then build the React Native app to call those endpoints.

**Deployed web app:** `https://mushroom-greenhouse.vercel.app`  
**Target platform:** Android (APK via EAS Build), iOS-ready structure  
**Language:** Arabic RTL throughout  

---

## Part 1 — Backend: `/api/mobile/` Routes (Next.js additions)

All routes live under `app/api/mobile/` in the existing Next.js project. Every route:
- Verifies the JWT from `Authorization: Bearer <token>` header
- Calls the same `lib/` helper functions the web app already uses
- Returns JSON
- Respects RBAC (same roles: ADMIN, OPERATOR, ACCOUNTANT, VIEWER)

### Authentication

| Endpoint | Method | Description |
|---|---|---|
| `/api/mobile/auth/login` | POST | email + password → JWT (7-day expiry) |
| `/api/mobile/auth/me` | GET | current user info + role + effectivePerms |

JWT is signed with `AUTH_SECRET` (same env var already in Vercel). No new secrets needed.

### Data Endpoints

| Endpoint | Methods | Description |
|---|---|---|
| `/api/mobile/dashboard` | GET | same data as `getDashboardData()` |
| `/api/mobile/cycles` | GET, POST | list + create cycle |
| `/api/mobile/cycles/[id]` | GET, PATCH, DELETE | single cycle detail + update + close |
| `/api/mobile/expenses` | GET, POST | list + create expense |
| `/api/mobile/expenses/[id]` | PATCH, DELETE | edit + delete expense |
| `/api/mobile/sales` | GET, POST | list + create sale |
| `/api/mobile/sales/[id]` | PATCH, DELETE | edit + delete sale |
| `/api/mobile/sales/[id]/pay` | POST | record partial payment |
| `/api/mobile/operations` | GET, POST | daily readings list + create |
| `/api/mobile/operations/[id]` | PATCH, DELETE | edit + delete reading |
| `/api/mobile/inventory` | GET, POST | inventory items + add item |
| `/api/mobile/inventory/[id]` | PATCH, DELETE | edit + delete item |
| `/api/mobile/custody` | GET, POST | custody transactions + add |
| `/api/mobile/custody/[id]` | PATCH, DELETE | edit + delete |
| `/api/mobile/reports` | GET | P&L data for one or multiple cycles |
| `/api/mobile/analytics` | GET | chart data (same as analytics page) |
| `/api/mobile/search` | GET | global search across all entities |
| `/api/mobile/settings` | GET, PATCH | app settings (financial, notifications) |
| `/api/mobile/greenhouses` | GET, POST | greenhouse list + create |
| `/api/mobile/greenhouses/[id]` | GET, PATCH, DELETE | greenhouse detail + update |
| `/api/mobile/partners` | GET, POST, PATCH | partners list + create + update |
| `/api/mobile/team` | GET, POST, PATCH | users list + create + update permissions |

### JWT Helper (shared utility)

```typescript
// lib/mobile-auth.ts (new file)
export function signMobileJwt(userId: string): string
export function verifyMobileJwt(token: string): { userId: string }
export async function getMobileSession(request: Request)
```

Uses `jose` library (already a transitive dependency via NextAuth).

---

## Part 2 — Mobile App: React Native / Expo

### Project Structure

```
mushroom-mobile/
├── app/
│   ├── _layout.tsx                  ← Root layout, RTL setup, auth guard
│   ├── (auth)/
│   │   └── login.tsx
│   └── (app)/
│       ├── _layout.tsx              ← Bottom tab navigator
│       ├── dashboard.tsx
│       ├── cycles/
│       │   ├── index.tsx            ← Cycles list
│       │   ├── [id].tsx             ← Cycle detail
│       │   └── create.tsx
│       ├── expenses/
│       │   ├── index.tsx
│       │   └── [id]/edit.tsx
│       ├── sales/
│       │   ├── index.tsx
│       │   └── [id]/edit.tsx
│       ├── operations/
│       │   ├── index.tsx
│       │   └── [id]/edit.tsx
│       ├── inventory/
│       │   └── index.tsx
│       ├── custody/
│       │   └── index.tsx
│       ├── reports/
│       │   └── index.tsx
│       ├── analytics/
│       │   └── index.tsx
│       ├── search.tsx
│       └── settings/
│           ├── index.tsx
│           ├── greenhouses/
│           ├── users/
│           ├── financial.tsx
│           ├── partners.tsx
│           └── notifications.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── ActionSheet.tsx
│   └── layout/
│       └── ScreenHeader.tsx
├── lib/
│   ├── api.ts                       ← axios instance + JWT interceptor + base URL
│   ├── auth.ts                      ← Zustand store (token, user, login, logout)
│   ├── format.ts                    ← Same formatEGP, formatDate, formatInt as web
│   └── queryClient.ts               ← TanStack Query client
├── hooks/
│   ├── useDashboard.ts
│   ├── useCycles.ts
│   ├── useSales.ts
│   └── ... (one hook file per entity)
├── app.json
├── eas.json
└── README.md
```

### Tech Stack

| Purpose | Library | Reason |
|---|---|---|
| Framework | Expo SDK 52 | Managed workflow, easiest APK builds |
| Navigation | expo-router v3 | File-based, same mental model as Next.js |
| Data fetching | TanStack Query v5 | Caching, loading states, mutations |
| Auth state | Zustand + expo-secure-store | Simple, JWT stored securely on device |
| Styling | NativeWind v4 | Tailwind syntax, matches web codebase |
| Charts | Victory Native | P&L and analytics charts |
| PDF export | expo-print + expo-sharing | Generate and share PDF reports |
| Excel export | xlsx + expo-sharing | Generate .xlsx and share |
| RTL | I18nManager.forceRTL(true) | Arabic RTL layout |
| Push notifications | Expo Push Notifications | Replaces Web Push (VAPID) |
| HTTP client | axios | Interceptors for JWT injection |

### Navigation Structure

```
Root Stack
├── (auth) group — visible when logged out
│   └── /login
└── (app) group — visible when logged in, protected
    ├── Bottom Tabs
    │   ├── Tab 1: Dashboard
    │   ├── Tab 2: Operations (daily readings)
    │   ├── Tab 3: [+] Quick Add (modal trigger)
    │   ├── Tab 4: Reports
    │   └── Tab 5: More (drawer with remaining screens)
    └── Modals / Sheets (pushed on top of tabs)
        ├── Create/Edit forms for each entity
        └── Settings screens
```

### Authentication Flow

1. User opens app → checks `expo-secure-store` for JWT token
2. If token found → call `/api/mobile/auth/me` to validate
3. If valid → go to Dashboard; if expired → go to Login
4. Login screen → POST to `/api/mobile/auth/login` → store JWT → go to Dashboard
5. All API calls include `Authorization: Bearer <token>` header via axios interceptor
6. 401 response → clear token → redirect to Login

### RTL Setup

In `app/_layout.tsx` (runs once at startup):
```typescript
import { I18nManager } from "react-native";
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);
```

NativeWind RTL utility classes (`rtl:flex-row-reverse`, `rtl:text-right`, etc.) handle layout mirroring.

### Feature Parity Map

| Web Screen | Mobile Screen | Notes |
|---|---|---|
| `/login` | `(auth)/login` | Same fields, JWT instead of cookie |
| `/dashboard` | `(app)/dashboard` | KPI cards + progress bar + alerts + quick add |
| `/cycles` | `(app)/cycles/` | List + create + detail + close cycle |
| `/expenses` | `(app)/expenses/` | List + create + edit + delete |
| `/sales` | `(app)/sales/` | List + create + edit + delete + partial payment |
| `/operations` | `(app)/operations/` | Daily readings + create + edit + delete |
| `/inventory` | `(app)/inventory/` | Item list + add item + balance display |
| `/custody` | `(app)/custody/` | Transaction list + add + edit + delete |
| `/reports` | `(app)/reports/` | P&L table + PDF export + Excel export |
| `/analytics` | `(app)/analytics/` | Victory Native charts |
| `/search` | `(app)/search` | Global search with results |
| `/settings/*` | `(app)/settings/` | Greenhouses, users, financial, partners, notifications |
| `/partners` | `(app)/settings/partners` | Merged into settings |
| `/team` | `(app)/settings/users` | Users + permissions modal |

### Push Notifications

Web app uses VAPID Web Push. For the mobile MVP:
- The Settings screen shows a toggle for notifications (reads/writes `UserPreferences` via `/api/mobile/settings`)
- Actual Expo Push delivery is out of scope for MVP — the existing Vercel Cron job is not modified
- Push delivery can be added in a follow-up by storing the Expo token and calling the Expo Push API from the cron job

### PDF / Excel Export

Reports screen has two export buttons:
- **PDF**: `expo-print` renders an HTML template → PDF → `expo-sharing` opens share sheet
- **Excel**: `xlsx` library builds a workbook → writes to `expo-file-system` temp dir → `expo-sharing` opens share sheet

Same data source as web (`/api/mobile/reports`).

### Error Handling

- Network errors: TanStack Query retry (3x) + user-facing toast via `react-native-toast-message`
- Auth errors (401): auto-logout + redirect to login
- Validation errors: inline field errors on forms
- No active cycle: empty state screens with "Create Cycle" CTA (same as web)

---

## Part 3 — Build Configuration

### `app.json` (key fields)

```json
{
  "expo": {
    "name": "نظام الماشروم",
    "slug": "mushroom-greenhouse",
    "version": "1.0.0",
    "orientation": "portrait",
    "android": {
      "package": "com.mushroom.greenhouse",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": ["NOTIFICATIONS", "INTERNET"]
    },
    "extra": {
      "apiBaseUrl": "https://mushroom-greenhouse.vercel.app"
    }
  }
}
```

### `eas.json`

```json
{
  "build": {
    "preview": { "android": { "buildType": "apk" } },
    "production": { "android": { "buildType": "apk" } }
  }
}
```

### Environment Variables (mobile)

| Variable | Value | Where stored |
|---|---|---|
| `API_BASE_URL` | `https://mushroom-greenhouse.vercel.app` | `app.json` extra |
| JWT Secret | `AUTH_SECRET` | Already on Vercel, not needed in mobile app |

---

## Part 4 — What Changes Where

### Files added to existing Next.js project

```
app/api/mobile/
  auth/login/route.ts
  auth/me/route.ts
  dashboard/route.ts
  cycles/route.ts
  cycles/[id]/route.ts
  expenses/route.ts
  expenses/[id]/route.ts
  sales/route.ts
  sales/[id]/route.ts
  sales/[id]/pay/route.ts
  operations/route.ts
  operations/[id]/route.ts
  inventory/route.ts
  inventory/[id]/route.ts
  custody/route.ts
  custody/[id]/route.ts
  reports/route.ts
  analytics/route.ts
  search/route.ts
  settings/route.ts
  greenhouses/route.ts
  greenhouses/[id]/route.ts
  partners/route.ts
  team/route.ts
  push/register/route.ts
lib/
  mobile-auth.ts              ← JWT sign/verify helper (new)
```

### Files NOT touched

- All existing `app/(app)/` pages
- All existing `actions/`
- All existing `lib/` (except adding `mobile-auth.ts`)
- `prisma/` schema
- `middleware.ts`
- `.env` variables

---

## Out of Scope

- iOS App Store submission (structure is iOS-ready but APK is the deliverable)
- Offline mode / data sync
- Biometric login
- In-app camera for receipts
