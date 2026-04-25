"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGreenhouseAction } from "@/actions/greenhouse";

export function CreateGreenhouseForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createGreenhouseAction(formData);
      if (!result.ok) setError(result.error);
      else {
        router.refresh();
        (document.getElementById("create-greenhouse-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <form id="create-greenhouse-form" action={onSubmit} className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="gh-number">رقم الصوبة</Label>
        <Input
          id="gh-number"
          name="number"
          type="number"
          min={1}
          max={99}
          required
          placeholder="2"
          className="tabular-nums"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="gh-name">اسم الصوبة</Label>
        <Input
          id="gh-name"
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder="مثال: الصوبة الجديدة"
        />
      </div>
      {error && (
        <div className="md:col-span-3">
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        </div>
      )}
      <div className="md:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الإنشاء..." : "إنشاء الصوبة"}
        </Button>
      </div>
    </form>
  );
}
