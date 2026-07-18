Task 1: Migrate to Firebase Firestore (Dexie stays as offline cache)
Approach: Firestore as primary data source. Dexie remains for offline reads. Drop XOR encryption (Firestore encrypts at rest). Replace the REST-based RTDB sync with Firestore SDK + onSnapshot real-time listeners.
Files to modify/create:
File	Action
package.json	Add firebase SDK dependency
.env.example	Add VITE_FIREBASE_* config vars (project ID, etc.)
src/firebase-config.ts	New — Firebase app init + Firestore instance
src/firestore-service.ts	New — CRUD operations per collection + onSnapshot listeners
src/firebase-sync.ts	Delete — replaced by firestore-service.ts
src/db.ts	Remove XOR encryption hooks, remove registerSyncHandlers, keep Dexie schema as offline cache. Add function to write-through to Firestore on local mutations.
src/App.tsx	Replace 17 useLiveQuery calls with Firestore onSnapshot hooks. Each listener writes incoming data to Dexie (cache) and to React state.
Data flow:
User action → Firestore write (primary) → onSnapshot callback → Dexie write (cache) → React state update
                ↘ (offline) → Dexie write → React state → sync queue → Firestore on reconnect
Key decisions:
- 12 Firestore collections matching current tables: users, partners, greenhouses, cycles, inventory, petty_cash, transactions, expenses, operational_logs, employees, assets, production
- No encryption layer — Firestore handles encryption at rest
- Dexie seed data remains for offline bootstrap; Firestore is seeded on first deploy via a one-time migration script or admin panel
- Backup/restore (exportEncryptedBackup / importEncryptedBackup) — keep the XOR file-level encryption for .dat exports (this is file encryption, not storage encryption, so still useful)
Risk: Data migration
Existing IndexedDB data needs to be pushed to Firestore on first load. Add a one-time migration check: if Firestore collection is empty but local Dexie has data, bulk-push Dexie → Firestore.
Task 2: Force Lock Screen on Every App Launch
Root cause: isInitialized reads from localStorage('mushroom_is_locked'). When it's 'false' (saved after successful unlock), the lock screen is bypassed on restart.
Fix (single file: src/App.tsx):
- Remove localStorage persistence for isLocked. Change the initializer to always return true:
const [isLocked, setIsLocked] = useState(true);
- Remove the localStorage.setItem('mushroom_is_locked', ...) calls on unlock (lines ~1207, 1239)
- Remove the localStorage.removeItem('mushroom_is_locked') on lock (line ~1241)
- Keep activeUser in localStorage (it's needed for UI display), but it no longer controls lock state
- Optional but recommended: Clear mushroom_is_locked from localStorage on mount so old values don't linger
This is a 3-line change. The lock screen guard at line 2055 (if (isLocked) return <LockScreen />) already works correctly — the bug is purely in the state initializer.
Task 3: Fix WhatsApp Link Preview (OG Tags)
Steps:
1. Copy d:\projects\Projects\mushroom-system\image.png → public/og-image.png
2. Update index.html meta tags:
Tag	Old Value	New Value
og:title	Mushroom System | نظام مزارع الفطر	Mushroom System | نظام مزارع الفطر (keep)
og:url	https://mushfarm.app/	https://mushroom-system-app.vercel.app/
og:image	https://mushfarm.app/logo_preview.jpg?v=11	https://mushroom-system-app.vercel.app/og-image.png
og:image:type	image/jpeg	image/png
twitter:image	https://mushfarm.app/logo_preview.jpg?v=11	https://mushroom-system-app.vercel.app/og-image.png
3. Remove og:image:width and og:image:height if the new image dimensions aren't 1200x630 (or keep them if they match)