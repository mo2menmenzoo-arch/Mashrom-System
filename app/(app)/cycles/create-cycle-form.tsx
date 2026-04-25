"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCycleAction } from "@/actions/cycle";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ الإنشاء..." : "إنشاء دورة جديدة"}
    </Button>
  );
}

type Greenhouse = { id: string; name: string; number: number };

export function CreateCycleForm({ greenhouses }: { greenhouses: Greenhouse[] }) {
  const [state, action] = useActionState(createCycleAction, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="greenhouseId">الصوبة</Label>
        <select
          id="greenhouseId"
          name="greenhouseId"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">اختر الصوبة...</option>
          {greenhouses.map((g) => (
            <option key={g.id} value={g.id}>
              صوبة {g.number} — {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="startDate">تاريخ البداية</Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          required
          defaultValue={today}
          className="tabular-nums"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات (اختياري)</Label>
        <Input id="notes" name="notes" type="text" maxLength={500} />
      </div>
      <div className="md:col-span-3">
        {state && !state.ok && (
          <p className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <SubmitButton />
      </div>
    </form>
  );
}
