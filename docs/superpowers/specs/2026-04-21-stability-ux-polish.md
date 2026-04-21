# Spec: Stability & UX Polish — 2026-04-21

## Scope

Three focused improvements to bring the system to production-ready stability:

1. Theme persistence from DB (no flash on load)
2. Per-button loading states in the system page
3. Toast feedback in all settings forms

---

## 1. Theme — DB as Source of Truth

### Problem

`UserPreferences.theme` is written to DB on every toggle, but on page load the theme is read only from `document.classList` (which itself depends on nothing — it starts without the `dark` class unless something sets it). Result: the DB value is never applied on load. Users on a new device or browser always see light mode regardless of their saved preference.

### Solution

**Two-part fix:**

**Part A — Anti-flash inline script in `app/layout.tsx`**

Inject a raw `<script>` tag inside `<head>` (before any CSS) that reads `localStorage.theme` and immediately applies `class="dark"` to `<html>`. This runs synchronously before paint, eliminating FOUC.

```html
<script dangerouslySetInnerHTML={{ __html: `
  (function(){
    var t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  })();
` }} />
```

This is intentionally localStorage-based because it must run before React hydrates (no DB access possible here).

**Part B — `ThemeSync` client component in `app/(app)/layout.tsx`**

The app layout is a Server Component. It fetches `UserPreferences` for the current user from DB and passes `theme` as a prop to a new `<ThemeSync theme={theme} />` Client Component.

`ThemeSync` runs a `useEffect` on mount that:
1. Applies the DB theme to `document.documentElement.classList`
2. Updates `localStorage` to match

This ensures the DB value wins on every authenticated page load, and syncs `localStorage` so the anti-flash script stays correct on next load.

### Data flow

```
Page load
  → inline script reads localStorage → applies class immediately (no flash)
  → React hydrates → ThemeSync mounts → reads DB theme from prop
  → ThemeSync applies DB theme to <html> → writes to localStorage
  → localStorage now matches DB for next load
```

### Files changed

- `app/layout.tsx` — add inline anti-flash script in `<head>`
- `app/(app)/layout.tsx` — fetch `UserPreferences`, render `<ThemeSync>`
- `components/theme-sync.tsx` — new Client Component (tiny, ~15 lines)

### Edge cases

- Unauthenticated routes (login, signup): no `ThemeSync`, localStorage-only anti-flash script still runs. Acceptable — those pages don't need user-specific theme.
- New user with no `UserPreferences` row: query returns `null`, default to `"light"`. No upsert needed on read — only on write.
- `system/page.tsx` toggle: already writes to both DB and localStorage. No change needed.

---

## 2. Per-button Loading States in system/page.tsx

### Problem

All three export/print buttons share a single `busy` state. Clicking "Export Excel" disables "Export CSV" and "Print/PDF" simultaneously — unnecessary and confusing.

### Solution

Replace `const [busy, setBusy] = useState(false)` with three independent states:

```ts
const [csvBusy, setCsvBusy] = useState(false);
const [excelBusy, setExcelBusy] = useState(false);
const [printBusy, setPrintBusy] = useState(false);
```

Each handler uses its own state. Button `disabled` prop uses its own state only.

### Files changed

- `app/(app)/settings/system/page.tsx` — split `busy` into three states

---

## 3. `useAction` Hook + Toast in All Settings Forms

### Problem

Settings forms (greenhouse, financial, partners) have no user feedback after save. The user clicks "حفظ" and sees nothing — no confirmation, no error. The `system/page.tsx` has a custom Toast inline but it's not reusable.

### Solution

**New `hooks/use-action.ts`** — a reusable hook wrapping `useTransition` + toast state:

```ts
type ActionState = { success: true } | { success: false; error: string } | null;

function useAction(action: (...args: any[]) => Promise<ActionState>) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function run(...args: any[]) {
    startTransition(async () => {
      const result = await action(...args);
      if (result) {
        setToast({ msg: result.success ? "تم الحفظ بنجاح ✓" : result.error, ok: result.success });
        setTimeout(() => setToast(null), 3000);
      }
    });
  }

  return { pending, toast, run };
}
```

**Toast UI component** — extracted from `system/page.tsx` into `components/ui/action-toast.tsx` so all pages can import it:

```tsx
export function ActionToast({ toast }: { toast: { msg: string; ok: boolean } | null }) {
  if (!toast) return null;
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
      toast.ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
    }`}>
      {toast.msg}
    </div>
  );
}
```

**Updated forms:**

| File | Change |
|------|--------|
| `greenhouse-form.tsx` | Use `useAction` hook, add `<ActionToast>`, button shows spinner when `pending` |
| `financial-form.tsx` | Same |
| `partners-form.tsx` | Same (already has complex state; hook wraps the save action only) |
| `system/page.tsx` | Inline Toast replaced with `<ActionToast>`, per-button busy states |

### Button loading pattern

```tsx
<Button disabled={pending}>
  {pending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
  {pending ? "جارٍ الحفظ…" : "حفظ"}
</Button>
```

---

## Files Summary

| File | Action |
|------|--------|
| `app/layout.tsx` | Add anti-flash inline script |
| `app/(app)/layout.tsx` | Fetch UserPreferences, render ThemeSync |
| `components/theme-sync.tsx` | New — applies DB theme on mount |
| `components/ui/action-toast.tsx` | New — reusable toast UI |
| `hooks/use-action.ts` | New — useTransition + toast hook |
| `app/(app)/settings/system/page.tsx` | Per-button states, use ActionToast |
| `app/(app)/settings/greenhouse/greenhouse-form.tsx` | useAction + ActionToast |
| `app/(app)/settings/financial/financial-form.tsx` | useAction + ActionToast |
| `app/(app)/settings/partners/partners-form.tsx` | useAction + ActionToast |

---

## Out of Scope

- Adding new users (handled by `/signup`)
- Export actions data (already real DB data — confirmed in code review)
- Users page (already functional — role change + activate/deactivate)
- Multi-tenancy, Web Push, advanced reports
