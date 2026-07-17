# Mushroom System — 4-Issue Fix Plan

**Goal:** Fix logo linking, website performance, cross-device data sharing, and lock screen persistence.

**Architecture:** React 19 + Dexie.js (IndexedDB) + Firebase RTDB REST + Tailwind CSS 4 + Vite 6. Minimal targeted fixes to existing App.tsx monolith (~6400 lines). No restructuring.

**Files to modify:**
- `src/App.tsx` — Logo onClick, syncAfterWrite calls, lock screen early-return
- `src/firebase-sync.ts` — Add `isSyncConfigured()` helper
- `.env.example` — Add `VITE_FIREBASE_DB_URL`

---

## Task 1: Logo Link Integration

**File:** `src/App.tsx:2025-2029` (desktop sidebar logo button)

Add `onClick` to navigate home:
```tsx
onClick={() => {
  setActiveTab('الرئيسية');
  localStorage.setItem('mushroom_active_tab', 'الرئيسية');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}}
Same for mobile sidebar logo button at line 2122-2126 (add setMobileMenuOpen(false) too).
Run npm run lint to verify.
Task 2: Performance — Skip Sync When Not Configured
File: src/firebase-sync.ts — Add after line 71:
export function isSyncConfigured(): boolean {
  return FIREBASE_DB_URL.length > 0;
}
File: src/App.tsx:584-588 — Guard syncFromCloud:
if (syncMode && isSyncConfigured()) {
  await syncFromCloud(prodDb);
}
Import isSyncConfigured from ./firebase-sync.
Task 3: Data Sharing — Push After Every Write
File: src/App.tsx
Add import: import { pushTable, pullAll, isSyncConfigured } from './firebase-sync';
Add helper after line 435:
const syncAfterWrite = async (tableName: string) => {
  if (!isSyncConfigured() || demoMode) return;
  try {
    const data = await activeDb.table(tableName).toArray();
    await pushTable(tableName as any, data);
  } catch (e) {
    console.warn(`[sync] push after write to "${tableName}" failed:`, e);
  }
};
Add syncAfterWrite('table_name') after triggerStateRefresh() in each handler:
Handler	Table
handleAddCycleSubmit	cycles
handleAddExpenseSubmit	expenses
handleAddClimateSubmit	operational_logs
handleAddHarvestSubmit	operational_logs
handleAddInventorySubmit	inventory
handleSaveAsset	assets
handleSavePartner	partners
executeActualDelete	varies (pass table name)
Add periodic pull useEffect after existing sync useEffect (~line 595):
useEffect(() => {
  if (!isSyncConfigured() || demoMode) return;
  const pullOnFocus = async () => {
    try {
      await syncFromCloud(prodDb);
      triggerStateRefresh();
    } catch (e) { console.warn('[sync] pull failed:', e); }
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') pullOnFocus();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  const interval = setInterval(pullOnFocus, 30000);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    clearInterval(interval);
  };
}, [demoMode]);
Task 4: Lock Screen Persistence Fix
File: src/App.tsx:2016
Add early return BEFORE the main render. Move the lock screen JSX (lines 4764-4960) into this early return so it's the ONLY thing rendered when locked:
if (isLocked) {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans dark-theme" dir="rtl">
      {/* ... lock screen JSX ... */}
    </div>
  );
}
Remove the old lock screen overlay from bottom of render (lines 4764-4960).
This ensures: no data queries fire, no sync happens, lock screen is the ONLY content.
Task 5: Environment Variable Setup
File: .env.example — Add:
VITE_FIREBASE_DB_URL=""
User must set this in Vercel dashboard: Settings > Environment Variables > VITE_FIREBASE_DB_URL = https://your-project-default-rtdb.firebaseio.com
Task 6: Final Verification
1. npm run lint — TypeScript check
2. npm run build — Production build
3. Manual checklist:
- Logo click navigates to home
- Site loads without delay
- Data created on Device A appears on Device B
- Lock screen shows on every reload when locked
- After unlocking, returns to last active section
Execution Order
1. Task 1 (logo) + Task 2 (perf) + Task 5 (env) — quick wins
2. Task 4 (lock screen) — user-facing fix
3. Task 3 (data sharing) — critical fix, needs review
4. Task 6 (verification) — final check
Commits
- Commit 1: Tasks 1 + 2 + 5
- Commit 2: Tasks 3 + 4
- Commit 3: Task 6

---
