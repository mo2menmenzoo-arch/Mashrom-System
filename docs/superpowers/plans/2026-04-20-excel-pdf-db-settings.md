# Excel/PDF Export & DB-Backed Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage-based settings with a real DB (Organization + settings models), fix the broken Excel export button, and add a same-page PDF print feature.

**Architecture:** Two independent tracks. Track A: add `xlsx` dep, new `exportExcelAction` server action returning base64, new `getPrintDataAction`, update `system/page.tsx` with three working export buttons and inline print CSS. Track B: extend Prisma schema with Organization/settings/partner/preferences models, run migration with seed SQL, rewrite greenhouse/financial/partners pages as server+client pairs backed by server actions.

**Tech Stack:** Next.js 15 App Router, Prisma 5 + PostgreSQL (Neon), `xlsx` (SheetJS), zod, shadcn/ui, Arabic RTL

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add Organization, GreenhouseSettings, FinancialSettings, Partner, UserPreferences; extend User |
| `actions/settings.ts` | Modify | Add 5 new DB actions + 2 export actions |
| `app/(app)/settings/system/page.tsx` | Modify | Fix Excel button, add PDF button + print CSS injection |
| `app/(app)/settings/greenhouse/page.tsx` | Rewrite | Server component — loads from DB, renders GreenhouseForm |
| `app/(app)/settings/greenhouse/greenhouse-form.tsx` | Create | Client form — submits to updateGreenhouseSettingsAction |
| `app/(app)/settings/financial/page.tsx` | Rewrite | Server component — loads from DB, renders FinancialForm |
| `app/(app)/settings/financial/financial-form.tsx` | Create | Client form — submits to updateFinancialSettingsAction |
| `app/(app)/settings/partners/page.tsx` | Modify | Server component — loads partners from DB, passes to form |
| `app/(app)/settings/partners/partners-form.tsx` | Modify | Accept initialPartners prop, save via updatePartnersAction |

---

## Task 1: Install xlsx dependency

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install xlsx**

```bash
npm install xlsx
```

Expected output: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Verify type declarations are available**

```bash
node -e "const XLSX = require('xlsx'); console.log(XLSX.version)"
```

Expected: prints a version string like `0.20.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add xlsx (SheetJS) for Excel export"
```

---

## Task 2: Prisma schema — add Organization and settings models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new models to schema.prisma**

After the last model (`PushSubscription`), append:

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String   @default("الصوبة الرئيسية")
  createdAt DateTime @default(now())

  users              User[]
  greenhouseSettings GreenhouseSettings?
  financialSettings  FinancialSettings?
  partners           Partner[]
}

model GreenhouseSettings {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id])
  temperature    Float        @default(22)
  humidity       Float        @default(85)
  cycleDuration  Int          @default(60)
  updatedAt      DateTime     @updatedAt
}

model FinancialSettings {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id])
  currency       String       @default("EGP")
  taxRate        Float        @default(0)
  updatedAt      DateTime     @updatedAt
}

model Partner {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  sharePercent   Float
  position       Int          @default(0)
  updatedAt      DateTime     @updatedAt

  @@index([organizationId, position])
}

model UserPreferences {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme     String   @default("light")
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Extend the User model**

In `prisma/schema.prisma`, inside the `model User { ... }` block, add these two fields after `updatedAt`:

```prisma
  organizationId String?
  organization   Organization?   @relation(fields: [organizationId], references: [id])
  preferences    UserPreferences?
```

The User model's field list should now end with:
```prisma
  updatedAt     DateTime @updatedAt

  organizationId String?
  organization   Organization?    @relation(fields: [organizationId], references: [id])
  preferences    UserPreferences?

  accounts      Account[]
  auditLogs     AuditLog[]
  subscriptions PushSubscription[]
  createdCycles Cycle[]            @relation("CycleClosedBy")

  @@index([role, active])
```

- [ ] **Step 3: Verify schema is valid**

```bash
npx prisma validate
```

Expected: no errors printed.

- [ ] **Step 4: Commit schema**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add Organization, settings, partner, and user-preferences models"
```

---

## Task 3: Prisma migration with seed SQL

**Files:**
- Creates: `prisma/migrations/<timestamp>_add_org_settings/migration.sql` (auto-generated)

- [ ] **Step 1: Generate the migration**

```bash
npx prisma migrate dev --name add_org_settings
```

Expected: Prisma creates a new migration file and applies it. Output ends with `Your database is now in sync with your schema.`

- [ ] **Step 2: Append seed SQL to the migration file**

Open the newly created `prisma/migrations/<timestamp>_add_org_settings/migration.sql` and **append** these lines at the very end (after all the `CREATE TABLE` / `ALTER TABLE` statements):

```sql
-- Seed default organization
INSERT INTO "Organization" (id, name, "createdAt")
VALUES ('default-org', 'الصوبة الرئيسية', NOW())
ON CONFLICT (id) DO NOTHING;

-- Link all existing users to the default organization
UPDATE "User" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
```

- [ ] **Step 3: Apply the seed SQL to the live database**

Because `migrate dev` already ran, apply only the seed lines manually:

```bash
npx prisma db execute --stdin <<'SQL'
INSERT INTO "Organization" (id, name, "createdAt")
VALUES ('default-org', 'الصوبة الرئيسية', NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE "User" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
SQL
```

Expected: no error output.

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations prisma/schema.prisma
git commit -m "feat(db): migrate org/settings tables and seed default organization"
```

---

## Task 4: Server actions — DB settings (getOrgSettingsAction + updates)

**Files:**
- Modify: `actions/settings.ts`

- [ ] **Step 1: Add the new actions to actions/settings.ts**

Add the following after the existing `exportAllDataAction` function (at the end of the file):

```typescript
// ─── Org helpers ────────────────────────────────────────────────────────────

const DEFAULT_ORG_ID = "default-org";

export type OrgSettings = {
  greenhouse: { temperature: number; humidity: number; cycleDuration: number };
  financial: { currency: string; taxRate: number };
  partners: { id: string; name: string; sharePercent: number; position: number }[];
};

export async function getOrgSettingsAction(): Promise<OrgSettings> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("غير مصرح");

  const [gh, fin, partners] = await Promise.all([
    prisma.greenhouseSettings.upsert({
      where: { organizationId: DEFAULT_ORG_ID },
      create: { organizationId: DEFAULT_ORG_ID },
      update: {},
    }),
    prisma.financialSettings.upsert({
      where: { organizationId: DEFAULT_ORG_ID },
      create: { organizationId: DEFAULT_ORG_ID },
      update: {},
    }),
    prisma.partner.findMany({
      where: { organizationId: DEFAULT_ORG_ID },
      orderBy: { position: "asc" },
    }),
  ]);

  return {
    greenhouse: { temperature: gh.temperature, humidity: gh.humidity, cycleDuration: gh.cycleDuration },
    financial: { currency: fin.currency, taxRate: fin.taxRate },
    partners: partners.map((p) => ({ id: p.id, name: p.name, sharePercent: p.sharePercent, position: p.position })),
  };
}

// ─── Greenhouse ──────────────────────────────────────────────────────────────

const greenhouseSchema = z.object({
  temperature: z.coerce.number().min(0).max(50),
  humidity: z.coerce.number().min(0).max(100),
  cycleDuration: z.coerce.number().int().min(1).max(365),
});

export async function updateGreenhouseSettingsAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const parsed = greenhouseSchema.safeParse({
    temperature: formData.get("temperature"),
    humidity: formData.get("humidity"),
    cycleDuration: formData.get("cycleDuration"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  await prisma.greenhouseSettings.upsert({
    where: { organizationId: DEFAULT_ORG_ID },
    create: { organizationId: DEFAULT_ORG_ID, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/settings/greenhouse");
  return { success: true };
}

// ─── Financial ───────────────────────────────────────────────────────────────

const financialSchema = z.object({
  currency: z.enum(["EGP", "USD"]),
  taxRate: z.coerce.number().min(0).max(100),
});

export async function updateFinancialSettingsAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const parsed = financialSchema.safeParse({
    currency: formData.get("currency"),
    taxRate: formData.get("taxRate"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  await prisma.financialSettings.upsert({
    where: { organizationId: DEFAULT_ORG_ID },
    create: { organizationId: DEFAULT_ORG_ID, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/settings/financial");
  return { success: true };
}

// ─── Partners ────────────────────────────────────────────────────────────────

const partnersSchema = z.array(
  z.object({
    name: z.string().trim().min(1, "اسم الشريك مطلوب"),
    sharePercent: z.number().min(0).max(100),
    position: z.number().int().min(0),
  }),
);

export async function updatePartnersAction(
  partners: { name: string; sharePercent: number; position: number }[],
): Promise<SettingsResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const parsed = partnersSchema.safeParse(partners);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const total = parsed.data.reduce((s, p) => s + p.sharePercent, 0);
  if (total > 100) return { success: false, error: "إجمالي النسب يتجاوز 100%" };

  await prisma.$transaction([
    prisma.partner.deleteMany({ where: { organizationId: DEFAULT_ORG_ID } }),
    prisma.partner.createMany({
      data: parsed.data.map((p) => ({ ...p, organizationId: DEFAULT_ORG_ID })),
    }),
  ]);
  revalidatePath("/settings/partners");
  return { success: true };
}

// ─── Theme preference ────────────────────────────────────────────────────────

export async function updateThemePreferenceAction(theme: "light" | "dark"): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "غير مصرح" };

  await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, theme },
    update: { theme },
  });
  return { success: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `actions/settings.ts`.

- [ ] **Step 3: Commit**

```bash
git add actions/settings.ts
git commit -m "feat(actions): add getOrgSettingsAction, updateGreenhouseSettingsAction, updateFinancialSettingsAction, updatePartnersAction, updateThemePreferenceAction"
```

---

## Task 5: Greenhouse page — server component + client form

**Files:**
- Rewrite: `app/(app)/settings/greenhouse/page.tsx`
- Create: `app/(app)/settings/greenhouse/greenhouse-form.tsx`

- [ ] **Step 1: Create greenhouse-form.tsx**

Create `app/(app)/settings/greenhouse/greenhouse-form.tsx`:

```typescript
"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";
import { updateGreenhouseSettingsAction } from "@/actions/settings";

type Props = {
  defaults: { temperature: number; humidity: number; cycleDuration: number };
};

export function GreenhouseForm({ defaults }: Props) {
  const [state, action, pending] = useActionState(updateGreenhouseSettingsAction, undefined);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Leaf className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-base">القيم الافتراضية للصوبة</CardTitle>
          <CardDescription>درجة الحرارة والرطوبة المستهدفة ومدة الدورة</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="temperature">درجة الحرارة المستهدفة (°م)</Label>
              <Input
                id="temperature"
                name="temperature"
                type="number"
                min={0}
                max={50}
                defaultValue={defaults.temperature}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="humidity">الرطوبة المستهدفة (%)</Label>
              <Input
                id="humidity"
                name="humidity"
                type="number"
                min={0}
                max={100}
                defaultValue={defaults.humidity}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycleDuration">مدة الدورة (يوم)</Label>
              <Input
                id="cycleDuration"
                name="cycleDuration"
                type="number"
                min={1}
                max={365}
                defaultValue={defaults.cycleDuration}
              />
            </div>
          </div>
          {state && !state.success && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600">تم الحفظ بنجاح</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Rewrite greenhouse/page.tsx as a server component**

Replace the entire content of `app/(app)/settings/greenhouse/page.tsx` with:

```typescript
import { getOrgSettingsAction } from "@/actions/settings";
import { GreenhouseForm } from "./greenhouse-form";

export default async function GreenhousePage() {
  const { greenhouse } = await getOrgSettingsAction();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الصوبة</h1>
        <p className="text-sm text-muted-foreground">القيم الافتراضية عند إنشاء دورة جديدة</p>
      </div>
      <GreenhouseForm defaults={greenhouse} />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/settings/greenhouse/
git commit -m "feat(settings): greenhouse page reads from DB via server action"
```

---

## Task 6: Financial page — server component + client form

**Files:**
- Rewrite: `app/(app)/settings/financial/page.tsx`
- Create: `app/(app)/settings/financial/financial-form.tsx`

- [ ] **Step 1: Create financial-form.tsx**

Create `app/(app)/settings/financial/financial-form.tsx`:

```typescript
"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { updateFinancialSettingsAction } from "@/actions/settings";

type Props = {
  defaults: { currency: string; taxRate: number };
};

export function FinancialForm({ defaults }: Props) {
  const [state, action, pending] = useActionState(updateFinancialSettingsAction, undefined);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <DollarSign className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-base">الإعدادات المالية الافتراضية</CardTitle>
          <CardDescription>تُستخدم كقيم مرجعية في تقارير النظام</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currency">العملة الافتراضية</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={defaults.currency}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRate">نسبة الضريبة (%)</Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                defaultValue={defaults.taxRate}
              />
            </div>
          </div>
          {state && !state.success && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600">تم الحفظ بنجاح</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Rewrite financial/page.tsx as a server component**

Replace the entire content of `app/(app)/settings/financial/page.tsx` with:

```typescript
import { getOrgSettingsAction } from "@/actions/settings";
import { FinancialForm } from "./financial-form";

export default async function FinancialPage() {
  const { financial } = await getOrgSettingsAction();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات المالية</h1>
        <p className="text-sm text-muted-foreground">العملة الافتراضية ونسبة الضريبة</p>
      </div>
      <FinancialForm defaults={financial} />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/settings/financial/
git commit -m "feat(settings): financial page reads from DB via server action"
```

---

## Task 7: Partners page — server component + updated client form

**Files:**
- Modify: `app/(app)/settings/partners/page.tsx`
- Modify: `app/(app)/settings/partners/partners-form.tsx`

- [ ] **Step 1: Rewrite partners-form.tsx to remove localStorage and call server action**

Replace the entire content of `app/(app)/settings/partners/partners-form.tsx` with:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { updatePartnersAction } from "@/actions/settings";

type Partner = { id: string; name: string; sharePercent: number };

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export function PartnerSharesForm({ initialPartners }: { initialPartners: Partner[] }) {
  const [partners, setPartners] = useState<Partner[]>(
    initialPartners.length > 0
      ? initialPartners
      : [{ id: crypto.randomUUID(), name: "", sharePercent: 0 }],
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const total = partners.reduce((sum, p) => sum + (Number(p.sharePercent) || 0), 0);
  const overLimit = total > 100;

  function addPartner() {
    setPartners((prev) => [...prev, { id: crypto.randomUUID(), name: "", sharePercent: 0 }]);
  }

  function removePartner(id: string) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePartner(id: string, field: "name" | "sharePercent", value: string | number) {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function handleSave() {
    if (overLimit) return;
    setSaving(true);
    try {
      const result = await updatePartnersAction(
        partners.map((p, i) => ({ name: p.name, sharePercent: Number(p.sharePercent) || 0, position: i })),
      );
      setToast({ msg: result.success ? "تم حفظ توزيع الأرباح بنجاح" : result.error, ok: result.success });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_120px_40px] gap-3 px-1">
        <p className="text-xs font-medium text-muted-foreground">اسم الشريك</p>
        <p className="text-xs font-medium text-muted-foreground">النسبة (%)</p>
        <span />
      </div>

      {partners.map((partner) => (
        <div key={partner.id} className="grid grid-cols-[1fr_120px_40px] items-center gap-3">
          <Input
            placeholder="اسم الشريك"
            value={partner.name}
            onChange={(e) => updatePartner(partner.id, "name", e.target.value)}
          />
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={partner.sharePercent}
            onChange={(e) => updatePartner(partner.id, "sharePercent", Number(e.target.value))}
          />
          <button
            type="button"
            onClick={() => removePartner(partner.id)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addPartner} className="gap-2">
        <Plus className="h-4 w-4" />
        إضافة شريك
      </Button>

      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium",
          total === 100
            ? "border-green-500/30 bg-green-500/10 text-green-600"
            : overLimit
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-amber-500/30 bg-amber-500/10 text-amber-600",
        )}
      >
        <span>الإجمالي: {total.toFixed(1)}%</span>
        {overLimit && <span>تجاوز 100%! يرجى تصحيح النسب.</span>}
        {!overLimit && total < 100 && <span>المتبقي: {(100 - total).toFixed(1)}%</span>}
        {total === 100 && <span>✓ مكتمل</span>}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={overLimit || saving}>
          {saving ? "جارٍ الحفظ…" : "حفظ التوزيع"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite partners/page.tsx as a server component**

Replace the entire content of `app/(app)/settings/partners/page.tsx` with:

```typescript
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import { getOrgSettingsAction } from "@/actions/settings";
import { PartnerSharesForm } from "./partners-form";

export default async function PartnersPage() {
  const { partners } = await getOrgSettingsAction();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">توزيع أرباح الشركاء</h1>
        <p className="text-sm text-muted-foreground">تحكم في توزيع صافي الربح بين الشركاء بالنسب المئوية</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">النسبة المئوية للشركاء</CardTitle>
            <CardDescription>تحكم في توزيع صافي الربح بين الشركاء بالنسب المئوية.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PartnerSharesForm initialPartners={partners} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/settings/partners/
git commit -m "feat(settings): partners page reads/writes DB, removes localStorage"
```

---

## Task 8: Excel server action

**Files:**
- Modify: `actions/settings.ts`

- [ ] **Step 1: Add exportExcelAction and getPrintDataAction to actions/settings.ts**

Add the `xlsx` import at the top of `actions/settings.ts`, right after the existing imports:

```typescript
import * as XLSX from "xlsx";
```

Then append these two functions at the end of `actions/settings.ts`:

```typescript
// ─── Excel export ────────────────────────────────────────────────────────────

export async function exportExcelAction(): Promise<SettingsResult & { base64?: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const [sales, expenses, deposits, withdrawals, inventory] = await Promise.all([
    prisma.sale.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.custodyDeposit.findMany({ orderBy: { date: "desc" } }),
    prisma.custodyWithdrawal.findMany({ orderBy: { date: "desc" } }),
    prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      sales.map((s) => ({
        التاريخ: s.date.toISOString().slice(0, 10),
        العميل: s.customerName,
        الكراتين: s.cartons,
        "سعر الكرتون": Number(s.pricePerCarton),
        الإجمالي: Number(s.total),
        المدفوع: Number(s.paid),
        الدورة: s.cycle.number,
      })),
    ),
    "مبيعات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      expenses.map((e) => ({
        التاريخ: e.date.toISOString().slice(0, 10),
        الوصف: e.description,
        المبلغ: Number(e.amount),
        الدورة: e.cycle.number,
      })),
    ),
    "مصروفات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      deposits.map((d) => ({
        التاريخ: d.date.toISOString().slice(0, 10),
        المبلغ: Number(d.amount),
        ملاحظات: d.notes ?? "",
      })),
    ),
    "إيداعات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      withdrawals.map((w) => ({
        التاريخ: w.date.toISOString().slice(0, 10),
        الوصف: w.description,
        المبلغ: Number(w.amount),
      })),
    ),
    "صرفيات",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      inventory.map((i) => ({
        الاسم: i.name,
        "الكمية الأولية": Number(i.initialQty),
        الوحدة: i.unit,
      })),
    ),
    "مخزن",
  );

  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return { success: true, base64 };
}

// ─── Print data ───────────────────────────────────────────────────────────────

export type PrintData = {
  sales: { date: string; customerName: string; cartons: number; total: number; cycle: number }[];
  expenses: { date: string; description: string; amount: number; cycle: number }[];
  deposits: { date: string; amount: number; notes: string }[];
  withdrawals: { date: string; description: string; amount: number }[];
  inventory: { name: string; initialQty: number; unit: string }[];
};

export async function getPrintDataAction(): Promise<SettingsResult & { data?: PrintData }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "غير مصرح" };

  const [sales, expenses, deposits, withdrawals, inventory] = await Promise.all([
    prisma.sale.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ include: { cycle: { select: { number: true } } }, orderBy: { date: "desc" } }),
    prisma.custodyDeposit.findMany({ orderBy: { date: "desc" } }),
    prisma.custodyWithdrawal.findMany({ orderBy: { date: "desc" } }),
    prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return {
    success: true,
    data: {
      sales: sales.map((s) => ({ date: s.date.toISOString().slice(0, 10), customerName: s.customerName, cartons: s.cartons, total: Number(s.total), cycle: s.cycle.number })),
      expenses: expenses.map((e) => ({ date: e.date.toISOString().slice(0, 10), description: e.description, amount: Number(e.amount), cycle: e.cycle.number })),
      deposits: deposits.map((d) => ({ date: d.date.toISOString().slice(0, 10), amount: Number(d.amount), notes: d.notes ?? "" })),
      withdrawals: withdrawals.map((w) => ({ date: w.date.toISOString().slice(0, 10), description: w.description, amount: Number(w.amount) })),
      inventory: inventory.map((i) => ({ name: i.name, initialQty: Number(i.initialQty), unit: i.unit })),
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add actions/settings.ts
git commit -m "feat(actions): add exportExcelAction and getPrintDataAction"
```

---

## Task 9: System page — fix Excel, add PDF print button, integrate theme DB sync

**Files:**
- Modify: `app/(app)/settings/system/page.tsx`

- [ ] **Step 1: Replace system/page.tsx entirely**

Replace the entire content of `app/(app)/settings/system/page.tsx` with:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Moon, Download, Printer } from "lucide-react";
import { exportAllDataAction, exportExcelAction, getPrintDataAction, updateThemePreferenceAction } from "@/actions/settings";
import type { PrintData } from "@/actions/settings";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

function buildPrintHtml(data: PrintData): string {
  function table(title: string, headers: string[], rows: string[][]): string {
    return `
      <h2>${title}</h2>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقرير بيانات الصوبة</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&display=swap');
    body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; font-size: 12px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: right; }
    th { background: #f0f0f0; font-weight: 600; }
    @media print { body { padding: 0; } h2 { page-break-before: auto; } }
  </style>
</head>
<body>
  <h1>تقرير بيانات الصوبة — ${new Date().toLocaleDateString("ar-EG")}</h1>
  ${table("المبيعات", ["التاريخ", "العميل", "الكراتين", "الإجمالي", "الدورة"], data.sales.map((s) => [s.date, s.customerName, String(s.cartons), String(s.total), String(s.cycle)]))}
  ${table("المصروفات", ["التاريخ", "الوصف", "المبلغ", "الدورة"], data.expenses.map((e) => [e.date, e.description, String(e.amount), String(e.cycle)]))}
  ${table("إيداعات العهدة", ["التاريخ", "المبلغ", "ملاحظات"], data.deposits.map((d) => [d.date, String(d.amount), d.notes]))}
  ${table("صرفيات العهدة", ["التاريخ", "الوصف", "المبلغ"], data.withdrawals.map((w) => [w.date, w.description, String(w.amount)]))}
  ${table("المخزن", ["الاسم", "الكمية الأولية", "الوحدة"], data.inventory.map((i) => [i.name, String(i.initialQty), i.unit]))}
</body>
</html>`;
}

export default function SystemPage() {
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    await updateThemePreferenceAction(next ? "dark" : "light");
  }

  async function handleExportCsv() {
    setBusy(true);
    try {
      const result = await exportAllDataAction();
      if (!result.success) { showToast(result.error, false); return; }
      const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير CSV بنجاح", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleExportExcel() {
    setBusy(true);
    try {
      const result = await exportExcelAction();
      if (!result.success) { showToast(result.error, false); return; }
      const bytes = Uint8Array.from(atob(result.base64!), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير Excel بنجاح", true);
    } finally {
      setBusy(false);
    }
  }

  async function handlePrintPdf() {
    setBusy(true);
    try {
      const result = await getPrintDataAction();
      if (!result.success) { showToast(result.error, false); return; }

      const printDiv = document.createElement("div");
      printDiv.id = "print-content";
      printDiv.innerHTML = buildPrintHtml(result.data!);

      const style = document.createElement("style");
      style.id = "print-hide-style";
      style.textContent = `@media print { body > *:not(#print-content) { display: none !important; } #print-content { display: block !important; } }`;

      document.body.appendChild(printDiv);
      document.head.appendChild(style);

      window.print();

      const cleanup = () => {
        document.getElementById("print-content")?.remove();
        document.getElementById("print-hide-style")?.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 5000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">النظام والبيانات</h1>
        <p className="text-sm text-muted-foreground">إعدادات المظهر وتصدير البيانات</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">النظام والبيانات</CardTitle>
            <CardDescription>تحكم في مظهر التطبيق وتصدير جميع البيانات</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Toggle */}
          <div>
            <p className="mb-3 text-sm font-semibold">المظهر</p>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{dark ? "الوضع الليلي" : "الوضع النهاري"}</p>
                <p className="text-xs text-muted-foreground">تبديل مظهر التطبيق</p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted transition-colors hover:bg-muted/70"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Export */}
          <div>
            <p className="mb-3 text-sm font-semibold">تصدير البيانات</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled={busy} onClick={handleExportCsv}>
                <Download className="me-2 h-4 w-4" />
                {busy ? "جارٍ التصدير…" : "تصدير CSV"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={handleExportExcel}>
                <Download className="me-2 h-4 w-4" />
                {busy ? "جارٍ التصدير…" : "تصدير Excel"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={handlePrintPdf}>
                <Printer className="me-2 h-4 w-4" />
                {busy ? "جارٍ التحميل…" : "طباعة / PDF"}
              </Button>
            </div>
          </div>

          {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        </CardContent>
      </Card>
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
git add app/\(app\)/settings/system/page.tsx
git commit -m "feat(settings): fix Excel export, add PDF print, sync theme to DB"
```

---

## Task 10: Push to GitHub and verify Vercel deploy

**Files:** none (deployment only)

- [ ] **Step 1: Push all commits**

```bash
git push origin master
```

Expected: pushes all task commits. Vercel auto-deploy triggers.

- [ ] **Step 2: Verify Vercel build succeeds**

Check the Vercel dashboard or wait for the GitHub commit status check to turn green. If the build fails, read the build log output and fix the reported error.

- [ ] **Step 3: Smoke test in production**

1. Navigate to `/settings/greenhouse` — values should load from DB (22°C / 85% / 60 days by default), change a value and save, reload to confirm persistence.
2. Navigate to `/settings/financial` — change currency, save, reload.
3. Navigate to `/settings/partners` — add two partners with total = 100%, save, reload.
4. Navigate to `/settings/system`:
   - Click "تصدير CSV" → CSV file downloads.
   - Click "تصدير Excel" → `.xlsx` file downloads and opens in Excel/LibreOffice with 5 sheets.
   - Click "طباعة / PDF" → browser print dialog opens with RTL Arabic tables.
   - Toggle dark/light mode — preference saved (refresh page, theme should be remembered if `useEffect` reads UserPreferences on mount — see note below).

> **Note on theme persistence on reload:** The current theme-on-load logic reads `localStorage.theme` (set in the existing `app/layout.tsx` script tag or similar). The `UserPreferences.theme` is stored in DB but is not yet read on initial page load — that is **out of scope** for this plan. The DB value is stored for future use (e.g., SSR theme detection).
