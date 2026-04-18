"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCycleAction } from "@/actions/cycle";

export function CreateCycleForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCycleAction(formData);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-4 md:grid-cols-3">
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
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">ملاحظات (اختياري)</Label>
        <Input id="notes" name="notes" type="text" maxLength={500} />
      </div>
      <div className="md:col-span-3">
        {error && (
          <p className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الإنشاء..." : "إنشاء دورة جديدة"}
        </Button>
      </div>
    </form>
  );
}
